import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { KeroClient, KeroError, localEnvironment, resolveKeroPath, runKero } from "../src/lib/kero";
import { SessionInputError } from "../src/lib/new-session";

async function fakeKero(source: string, run: (binary: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "raycast kero test "));
  const binary = join(directory, "fake kero");
  try {
    await writeFile(binary, `#!${process.execPath}\n${source}\n`, { mode: 0o755 });
    await run(binary);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function hasKind(kind: string) {
  return (error: unknown) => error instanceof KeroError && error.kind === kind;
}

test("removes inherited target/host without mutating parent environment", () => {
  const source = { KERO_HOST: "remote", KERO_SESSION: "session", KERO_PANE: "pane", PATH: "/usr/bin", HOME: "/home" };
  assert.deepEqual(localEnvironment(source), { PATH: "/usr/bin", HOME: "/home" });
  assert.equal(source.KERO_HOST, "remote");
});

test("explicit executable path supports spaces; bad preferences never silently fall back", async () => {
  await fakeKero("", async (binary) => assert.equal(await resolveKeroPath(binary), binary));
  await assert.rejects(resolveKeroPath("/does/not/exist/kero"), hasKind("missing-cli"));
  await assert.rejects(resolveKeroPath("./kero"), hasKind("missing-cli"));
});

test("passes arguments literally without shell expansion", async () => {
  await fakeKero("console.log(JSON.stringify(process.argv.slice(2)))", async (binary) => {
    const args = ["focus", "a b; $(touch /tmp/should-not-run)"];
    assert.deepEqual(JSON.parse(await runKero(binary, args)), args);
  });
});

test("client reads JSON and focuses only an explicit pane", async () => {
  await fakeKero(
    `
    const args = process.argv.slice(2);
    if (args[0] === 'ls') console.log(JSON.stringify([{id:'s',panes:[{id:'p'}]}]));
    else if (args[0] === 'projects') console.log(JSON.stringify([{id:'project',name:'Project'}]));
    else if (JSON.stringify(args) !== JSON.stringify(['focus','p'])) process.exit(2);
  `,
    async (binary) => {
      const client = new KeroClient(binary);
      assert.equal((await client.sessions())[0].panes[0].id, "p");
      assert.equal((await client.projects())[0].id, "project");
      await client.focus("p");
      await assert.rejects(client.focus("--all"), hasKind("missing-target"));
      await assert.rejects(client.focus(""), hasKind("missing-target"));
    },
  );
});

test("creates a local shell session with explicit Home and opens only its returned pane on request", async () => {
  await fakeKero(
    `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    const path = require('node:path');
    const args = process.argv.slice(2);
    fs.appendFileSync(path.join(path.dirname(process.argv[1]), 'calls'), JSON.stringify(args) + '\\n');
    for (const key of ['KERO_HOST', 'KERO_SESSION', 'KERO_PANE']) assert.equal(process.env[key], undefined);
    if (args[0] === 'new') {
      assert.deepEqual(args, ['new', '--json', '--dir', require('node:os').homedir()]);
      console.log(JSON.stringify({id:'new-session',panes:[{id:'new-pane',shell:'zsh'}]}));
    } else assert.deepEqual(args, ['focus', 'new-pane']);
  `,
    async (binary) => {
      const client = new KeroClient(binary);
      const session = await client.createSession({});
      assert.equal(session.id, "new-session");
      assert.equal(session.panes[0].shell, "zsh");
      const calls = join(dirname(binary), "calls");
      assert.equal((await readFile(calls, "utf8")).trim().split("\n").length, 1, "Creation must not implicitly focus");
      await client.focus(session.panes[0].id);
      assert.deepEqual(
        (await readFile(calls, "utf8"))
          .trim()
          .split("\n")
          .map((row) => JSON.parse(row)),
        [
          ["new", "--json", "--dir", homedir()],
          ["focus", "new-pane"],
        ],
      );
    },
  );
});

test("creation refreshes projects and passes the selected ID, directory, and name literally", async () => {
  const name = "--focus ; $(not-a-command) 'quoted'";
  await fakeKero(
    `
    const assert = require('node:assert/strict');
    const path = require('node:path');
    const args = process.argv.slice(2);
    const dir = path.dirname(process.argv[1]);
    if (args[0] === 'projects') console.log(JSON.stringify([{id:'a',name:'same'}, {id:'b',name:'same',dir}]));
    else {
      assert.deepEqual(args, ['new','--json','--dir',dir,'--project','b','--name',${JSON.stringify(name)}]);
      console.log(JSON.stringify({id:'session',project:'b',panes:[{id:'pane'}]}));
    }
  `,
    async (binary) => {
      const session = await new KeroClient(binary).createSession({ projectId: "b", name });
      assert.equal(session.project, "b");
    },
  );
});

test("stale projects and invalid directories fail before a create request", async () => {
  await fakeKero(
    `
    if (process.argv[2] !== 'projects') throw new Error('Must not create');
    console.log('[]');
  `,
    async (binary) => {
      const client = new KeroClient(binary);
      await assert.rejects(
        client.createSession({ projectId: "deleted" }),
        (error: unknown) => error instanceof SessionInputError && error.field === "projectId",
      );
      await assert.rejects(
        client.createSession({ directory: "relative" }),
        (error: unknown) => error instanceof SessionInputError && error.field === "directory",
      );
    },
  );
});

test("project-query failures and missing executables are not reported as uncertain mutations", async () => {
  await fakeKero("process.exit(4)", async (binary) => {
    await assert.rejects(new KeroClient(binary).createSession({ projectId: "p" }), hasKind("unreachable"));
  });
  await assert.rejects(new KeroClient("/does/not/exist/kero").createSession({}), hasKind("missing-cli"));
});

for (const output of [
  "not json",
  "{}",
  '{"id":"s","panes":[]}',
  '{"id":"s","panes":[{"id":"--flag"}]}',
  '{"id":"s","panes":[{"id":"a"},{"id":"b"}]}',
]) {
  test(`unexpected creation response is uncertain, never retried or focused: ${output}`, async () => {
    await fakeKero(
      `
      const fs = require('node:fs');
      const path = require('node:path');
      fs.appendFileSync(path.join(path.dirname(process.argv[1]), 'calls'), process.argv[2] + '\\n');
      console.log(${JSON.stringify(output)});
    `,
      async (binary) => {
        await assert.rejects(new KeroClient(binary).createSession({}), hasKind("creation-uncertain"));
        assert.equal(await readFile(join(dirname(binary), "calls"), "utf8"), "new\n");
      },
    );
  });
}

test("creation failures preserve the error and warn against blindly creating again", async () => {
  await fakeKero("console.error('Remote control denied'); process.exit(1)", async (binary) => {
    await assert.rejects(
      new KeroClient(binary).createSession({}),
      (error: unknown) =>
        error instanceof KeroError &&
        error.kind === "creation-uncertain" &&
        /Remote control denied/.test(error.message) &&
        /Check Search Kero Sessions/.test(error.message),
    );
  });
});

test("timed-out creation is uncertain and is never automatically retried", async () => {
  await fakeKero(
    `
    const fs = require('node:fs');
    const path = require('node:path');
    fs.appendFileSync(path.join(path.dirname(process.argv[1]), 'calls'), process.argv[2] + '\\n');
    setInterval(() => {}, 1000);
  `,
    async (binary) => {
      await assert.rejects(
        new KeroClient(binary).createSession({}),
        (error: unknown) =>
          error instanceof KeroError && error.kind === "creation-uncertain" && !error.message.includes("Try again"),
      );
      assert.equal(await readFile(join(dirname(binary), "calls"), "utf8"), "new\n");
    },
  );
});

for (const [code, kind] of [
  [3, "missing-target"],
  [4, "unreachable"],
  [1, "failed"],
  [2, "failed"],
] as const) {
  test(`maps CLI exit ${code} to ${kind}`, async () => {
    await fakeKero(`console.error('Remote control denied'); process.exit(${code});`, async (binary) => {
      await assert.rejects(runKero(binary, ["focus", "p"]), hasKind(kind));
    });
  });
}

test("reports invalid JSON instead of crashing the list", async () => {
  await fakeKero("console.log('not json')", async (binary) => {
    await assert.rejects(new KeroClient(binary).sessions(), hasKind("invalid-data"));
  });
});

test("missing executable produces actionable error", async () => {
  await assert.rejects(runKero("/does/not/exist/kero", ["ls"]), hasKind("missing-cli"));
});

test("an aborted request stops its child process", async () => {
  await fakeKero("setInterval(() => {}, 1000)", async (binary) => {
    const controller = new AbortController();
    const pending = runKero(binary, ["ls"], controller.signal);
    controller.abort();
    await assert.rejects(pending, (error: unknown) => error instanceof Error && error.name === "AbortError");
  });
});

test("a hung CLI is terminated by the timeout", async () => {
  await fakeKero("setInterval(() => {}, 1000)", async (binary) => {
    await assert.rejects(runKero(binary, ["ls"]), hasKind("timeout"));
  });
});
