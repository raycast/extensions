import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, realpath, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test, { TestContext } from "node:test";
import { scan } from "../src/services/scan-manager";
import { cliEnvironment, readVersion } from "../src/services/npkill-cli";
import { Artifact, ScanOptions } from "../src/types";

async function fixture(t: TestContext) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "npkill-scan-")));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const options = (root: string, executable = resolve("node_modules/.bin/npkill")): ScanOptions => ({
  root,
  executable,
  profiles: "node",
  config: "",
  exclusions: "",
  includeSensitive: false,
});

async function fakeCli(root: string, body: string) {
  const path = join(root, "fake-npkill");
  await writeFile(
    path,
    `#!${process.execPath}\nif (process.argv.includes('--version')) { console.log('v1.0.0'); process.exit(0); }\n${body}`,
  );
  await chmod(path, 0o755);
  return path;
}

test(
  "real npkill 1.0.0 streams Node, Python, Rust, and custom profiles with .npkillrc exclusions",
  { timeout: 30000 },
  async (t) => {
    const root = await fixture(t);
    for (const [name, target, marker] of [
      ["node 雪 space", "node_modules", "package.json"],
      ["python", ".venv", "pyproject.toml"],
      ["rust", "target", "Cargo.toml"],
      ["unmarked", "target", "source.txt"],
      ["excluded", "node_modules", "package.json"],
      ["custom", "my-cache", "source.txt"],
    ]) {
      const project = join(root, name);
      await mkdir(join(project, target), { recursive: true });
      await writeFile(join(project, marker), marker === "package.json" ? "{}" : "fixture");
      await writeFile(join(project, target, "data.txt"), "fixture data");
      if (target === ".venv") await writeFile(join(project, target, "pyvenv.cfg"), "home = /usr/bin");
    }
    await writeFile(
      join(root, ".npkillrc"),
      JSON.stringify({
        exclude: ["excluded"],
        profiles: { local: { description: "Fixture cache", targets: ["my-cache"] } },
      }),
    );
    const found: Artifact[] = [];
    const warnings: string[] = [];
    const result = await scan({ ...options(root), profiles: "node,python,rust,local" }, new AbortController().signal, {
      onRoot: () => {},
      onArtifact: (item) => found.push(item),
      onWarning: (warning) => warnings.push(warning),
    });
    assert.equal(result, "complete", warnings.join("\n"));
    assert.deepEqual(
      found.map((item) => item.path).sort(),
      [
        join(root, "node 雪 space/node_modules"),
        join(root, "python/.venv"),
        join(root, "rust/target"),
        join(root, "custom/my-cache"),
      ].sort(),
    );
    assert.ok(found.every((item) => item.size !== null && item.size > 0));
    assert.ok(found.every((item) => item.activity !== null));
    assert.equal(warnings.length, 0);
    // The adapter is read-only even when custom configurations are present.
    assert.equal(await readFile(join(root, "node 雪 space/node_modules/data.txt"), "utf8"), "fixture data");
  },
);

test("real CLI reports invalid profile configuration without deleting files", { timeout: 15000 }, async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    scan({ ...options(root), profiles: "profile-that-does-not-exist" }, new AbortController().signal, {
      onRoot: () => {},
      onArtifact: () => {},
      onWarning: () => {},
    }),
    /profile|output/i,
  );
});

test(
  "streaming arrives before process exit, cancellation retains partial results and kills ignored SIGTERM",
  { timeout: 10000 },
  async (t) => {
    const root = await fixture(t);
    const path = join(root, "node_modules");
    await mkdir(path);
    const executable = await fakeCli(
      root,
      `require('node:fs').writeFileSync(${JSON.stringify(join(root, "pid"))}, String(process.pid)); process.on('SIGTERM', () => {}); console.log(JSON.stringify({version:1,result:{path:${JSON.stringify(path)},size:42,projectModificationTime:null}})); setInterval(() => {}, 1000);`,
    );
    const controller = new AbortController();
    const found: Artifact[] = [];
    const result = await scan(options(root, executable), controller.signal, {
      onRoot: () => {},
      onArtifact: (item) => {
        found.push(item);
        controller.abort();
      },
      onWarning: () => {},
    });
    assert.equal(result, "canceled");
    assert.equal(found.length, 1);
    const pid = Number(await readFile(join(root, "pid"), "utf8"));
    assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
  },
);

test("malformed stdout terminates a still-running child and rejects", { timeout: 10000 }, async (t) => {
  const root = await fixture(t);
  const executable = await fakeCli(
    root,
    `require('node:fs').writeFileSync(${JSON.stringify(join(root, "pid"))}, String(process.pid)); console.log('not json'); setInterval(() => {}, 1000);`,
  );
  await assert.rejects(
    scan(options(root, executable), new AbortController().signal, {
      onRoot: () => {},
      onArtifact: () => {},
      onWarning: () => {},
    }),
    /Incompatible/,
  );
  const pid = Number(await readFile(join(root, "pid"), "utf8"));
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
});

test("cancellation also terminates a hanging version probe", { timeout: 10000 }, async (t) => {
  const root = await fixture(t);
  const executable = join(root, "slow-version");
  await writeFile(
    executable,
    `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(join(root, "pid"))}, String(process.pid)); process.on('SIGTERM', () => {}); setInterval(() => {},1000);`,
  );
  await chmod(executable, 0o755);
  const controller = new AbortController();
  const result = readVersion(executable, cliEnvironment(executable), controller.signal);
  const rejection = assert.rejects(result, /canceled/);
  // Wait for observable startup rather than depending on process-launch timing.
  let pid: number | undefined;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      pid = Number(await readFile(join(root, "pid"), "utf8"));
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  controller.abort();
  await rejection;
  assert.ok(pid, "version probe started");
  assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
});

test("valid results preceding malformed output in one chunk are retained", async (t) => {
  const root = await fixture(t);
  const path = join(root, "node_modules");
  await mkdir(path);
  const executable = await fakeCli(
    root,
    `process.stdout.write(JSON.stringify({version:1,result:{path:${JSON.stringify(path)},size:1,projectModificationTime:null}})+'\\ninvalid\\n');`,
  );
  const found: Artifact[] = [];
  await assert.rejects(
    scan(options(root, executable), new AbortController().signal, {
      onRoot: () => {},
      onArtifact: (item) => found.push(item),
      onWarning: () => {},
    }),
    /Incompatible/,
  );
  assert.equal(found.length, 1);
});

test("nonzero exit includes structured stderr and preserves previously emitted records", async (t) => {
  const root = await fixture(t);
  const path = join(root, "node_modules");
  await mkdir(path);
  const executable = await fakeCli(
    root,
    `console.log(JSON.stringify({version:1,result:{path:${JSON.stringify(path)},size:null,projectModificationTime:null}})); console.error(JSON.stringify({version:1,error:true,message:'Permission denied: /test/protected'})); process.exitCode=2;`,
  );
  const found: Artifact[] = [];
  const warnings: string[] = [];
  await assert.rejects(
    scan(options(root, executable), new AbortController().signal, {
      onRoot: () => {},
      onArtifact: (item) => found.push(item),
      onWarning: (message) => warnings.push(message),
    }),
    /code 2.*Permission denied/,
  );
  assert.equal(found.length, 1);
  assert.deepEqual(warnings, ["Permission denied: /test/protected"]);
});

test("sensitive records remain excluded unless explicitly enabled", async (t) => {
  const root = await fixture(t);
  const path = join(root, "node_modules");
  await mkdir(path);
  const executable = await fakeCli(
    root,
    `console.log(JSON.stringify({version:1,result:{path:${JSON.stringify(path)},size:20,projectModificationTime:null,riskAnalysis:{isSensitive:true,reason:'Application state'}}}));`,
  );
  const found: Artifact[] = [];
  const callbacks = { onRoot: () => {}, onArtifact: (item: Artifact) => found.push(item), onWarning: () => {} };
  await scan(options(root, executable), new AbortController().signal, callbacks);
  assert.equal(found.length, 0);
  await scan({ ...options(root, executable), includeSensitive: true }, new AbortController().signal, callbacks);
  assert.equal(found.length, 1);
});

test(
  "duplicate scans for a canonical root are rejected and the root is released after cancellation",
  { timeout: 10000 },
  async (t) => {
    const root = await fixture(t);
    const path = join(root, "node_modules");
    await mkdir(path);
    const executable = await fakeCli(
      root,
      `console.log(JSON.stringify({version:1,result:{path:${JSON.stringify(path)},size:20,projectModificationTime:null}})); setInterval(() => {},1000);`,
    );
    const controller = new AbortController();
    let ready!: () => void;
    const started = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const callbacks = { onRoot: () => {}, onArtifact: ready, onWarning: () => {} };
    const first = scan(options(root, executable), controller.signal, callbacks);
    await started;
    await assert.rejects(scan(options(root, executable), new AbortController().signal, callbacks), /already running/);
    controller.abort();
    await first;
    const second = new AbortController();
    await scan(options(root, executable), second.signal, { ...callbacks, onArtifact: () => second.abort() });
  },
);
