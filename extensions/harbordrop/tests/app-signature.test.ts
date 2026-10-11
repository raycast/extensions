import assert from "node:assert/strict";
import type { Application } from "@raycast/api";
import type { ExecFileException } from "node:child_process";
import {
  appendFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  APP_BUNDLE_ID,
  APP_REQUIREMENT,
  createCodeSignRunner,
  createOfficialAppVerifier,
  readAppIdentity,
} from "../src/lib/app-signature";
import { IntegrationError } from "../src/lib/errors";

const app: Application = {
  name: "HarborDrop",
  bundleId: APP_BUNDLE_ID,
  path: "/Applications/HarborDrop.app",
};
const identity = { canonicalPath: app.path, fingerprint: "first-generation" };

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

test("codesign runs directly with bounded output, cancellation, and a fixed environment", async () => {
  const literal = "/tmp/HarborDrop $(touch unexpected); 'quoted'.app";
  const signal = new AbortController().signal;
  let calls = 0;
  const run = createCodeSignRunner((file, args, options, callback) => {
    calls += 1;
    assert.equal(file, "/usr/bin/codesign");
    assert.deepEqual(args, ["--verify", literal]);
    assert.equal(options.shell, false);
    assert.equal(options.cwd, "/");
    assert.equal(options.timeout, 15000);
    assert.equal(options.maxBuffer, 65536);
    assert.equal(options.killSignal, "SIGKILL");
    assert.equal(options.signal, signal);
    assert.deepEqual(options.env, {
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
    });
    callback(null, "", "");
  });
  await run(["--verify", literal], signal);
  assert.equal(calls, 1);
});

test("nonzero exit and infrastructure failures block use without alleging tampering or exposing output", async () => {
  for (const [failure, expected] of [
    [{ code: 1 }, "appVerificationFailed"],
    [{ code: null, killed: true }, "appVerificationFailed"],
    [{ code: "ENOENT" }, "appVerificationFailed"],
    [{ code: "EACCES" }, "appVerificationFailed"],
    [{ code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" }, "appVerificationFailed"],
  ] as const) {
    const run = createCodeSignRunner((_file, _args, _options, callback) => {
      callback(
        Object.assign(
          new Error("private path and output"),
          failure,
        ) as ExecFileException,
        "private stdout",
        "private stderr",
      );
    });
    await assert.rejects(run([], new AbortController().signal), (error) => {
      assert.ok(error instanceof IntegrationError);
      assert.equal(error.code, expected);
      assert.equal(error.message.includes("private"), false);
      return true;
    });
  }
});

test("official identity is required only at the top level, with separate deep integrity", async () => {
  const path = "/tmp/HarborDrop $(touch unexpected).app";
  const recorded: string[][] = [];
  const verify = createOfficialAppVerifier({
    readIdentity: async () => ({
      canonicalPath: path,
      fingerprint: "generation",
    }),
    runCodesign: async (args) => {
      recorded.push([...args]);
    },
  });
  const result = await verify({ ...app, path: "/tmp/alias.app" });
  assert.equal(result.path, path);
  assert.equal(
    APP_REQUIREMENT,
    'anchor apple generic and identifier "com.hjm.harbordrop" and certificate leaf[subject.OU] = "54V3JMN338"',
  );
  assert.deepEqual(recorded, [
    [
      "--verify",
      "--strict",
      "--all-architectures",
      "--test-requirement",
      `=${APP_REQUIREMENT}`,
      path,
    ],
    ["--verify", "--deep", "--strict", "--all-architectures", path],
  ]);
});

test("a synchronous process creation failure is reported safely", async () => {
  const run = createCodeSignRunner(() => {
    throw new Error("private process details");
  });
  await assert.rejects(run([], new AbortController().signal), {
    code: "appVerificationFailed",
  });
});

test("wrong app identity or rejected official requirement never reaches deep verification", async () => {
  let calls = 0;
  const verify = createOfficialAppVerifier({
    readIdentity: async () => identity,
    runCodesign: async () => {
      calls += 1;
      throw new IntegrationError("appSignatureInvalid");
    },
  });
  await assert.rejects(verify({ ...app, bundleId: "other.app" }), {
    code: "appSignatureInvalid",
  });
  assert.equal(calls, 0);
  await assert.rejects(verify(app), { code: "appSignatureInvalid" });
  assert.equal(calls, 1);
});

test("nested tampering fails even when top-level identity succeeds", async () => {
  let calls = 0;
  const verify = createOfficialAppVerifier({
    readIdentity: async () => identity,
    runCodesign: async (args) => {
      calls += 1;
      if (args.includes("--deep"))
        throw new IntegrationError("appSignatureInvalid");
    },
  });
  await assert.rejects(verify(app), { code: "appSignatureInvalid" });
  assert.equal(calls, 2);
});

test("concurrent checks share work, but a later action must verify again", async () => {
  const started = deferred();
  const release = deferred();
  let calls = 0;
  const verify = createOfficialAppVerifier({
    readIdentity: async () => identity,
    runCodesign: async () => {
      calls += 1;
      if (calls === 1) {
        started.resolve();
        await release.promise;
      }
    },
  });
  const first = verify(app);
  const second = verify(app);
  await started.promise;
  assert.equal(calls, 1);
  release.resolve();
  await Promise.all([first, second]);
  assert.equal(calls, 2);
  await verify(app);
  assert.equal(calls, 4);
});

test("one cancelled caller does not cancel another caller's shared verification", async () => {
  const started = deferred();
  const release = deferred();
  const caller = new AbortController();
  let sharedSignal: AbortSignal | undefined;
  const verify = createOfficialAppVerifier({
    readIdentity: async () => identity,
    runCodesign: async (_args, signal) => {
      sharedSignal = signal;
      started.resolve();
      await release.promise;
    },
  });
  const cancelled = verify(app, caller.signal);
  const remaining = verify(app);
  await started.promise;
  caller.abort();
  await assert.rejects(cancelled, { code: "cancelled" });
  assert.equal(sharedSignal?.aborted, false);
  release.resolve();
  await remaining;
});

test("cancelling the last caller aborts the verifier and does not cache success", async () => {
  const started = deferred();
  const caller = new AbortController();
  let blocking = true;
  let sharedSignal: AbortSignal | undefined;
  let calls = 0;
  const verify = createOfficialAppVerifier({
    readIdentity: async () => identity,
    runCodesign: async (_args, signal) => {
      calls += 1;
      if (!blocking) return;
      sharedSignal = signal;
      started.resolve();
      await new Promise<void>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new IntegrationError("cancelled")),
          { once: true },
        );
      });
    },
  });
  const pending = verify(app, caller.signal);
  await started.promise;
  caller.abort();
  await assert.rejects(pending, { code: "cancelled" });
  assert.equal(sharedSignal?.aborted, true);
  blocking = false;
  await verify(app);
  assert.equal(calls, 3);
});

test("already cancelled checks never start a process", async () => {
  const caller = new AbortController();
  caller.abort();
  let calls = 0;
  const run = createCodeSignRunner(() => {
    calls += 1;
  });
  await assert.rejects(run([], caller.signal), { code: "cancelled" });
  const verify = createOfficialAppVerifier({
    readIdentity: async () => {
      throw new Error("must not read");
    },
    runCodesign: run,
  });
  await assert.rejects(verify(app, caller.signal), { code: "cancelled" });
  assert.equal(calls, 0);
});

test("bundle replacement, deletion, and alias retargeting during verification fail closed", async () => {
  for (const mode of ["replacement", "deletion", "alias"] as const) {
    let completed = false;
    const verify = createOfficialAppVerifier({
      readIdentity: async (path) => {
        if (completed && (mode !== "alias" || path === "/tmp/alias.app")) {
          if (mode === "deletion") throw new Error("missing");
          return { ...identity, fingerprint: "replacement" };
        }
        return identity;
      },
      runCodesign: async (args) => {
        if (args.includes("--deep")) completed = true;
      },
    });
    await assert.rejects(verify({ ...app, path: "/tmp/alias.app" }), {
      code: "appChanged",
    });
  }
});

test("filesystem identity observes executable changes and rejects unsafe bundle shapes", async () => {
  const root = await mkdtemp(join(tmpdir(), "harbordrop-signature-"));
  const bundle = join(root, "HarborDrop $(touch unexpected).app");
  const executable = join(bundle, "Contents/MacOS/HarborDrop");
  try {
    await mkdir(join(bundle, "Contents/MacOS"), { recursive: true });
    await mkdir(join(bundle, "Contents/_CodeSignature"));
    await writeFile(executable, "fixture executable");
    await writeFile(join(bundle, "Contents/Info.plist"), "fixture plist");
    await writeFile(
      join(bundle, "Contents/_CodeSignature/CodeResources"),
      "fixture seal",
    );
    const first = await readAppIdentity(bundle);
    await appendFile(executable, "changed");
    assert.notEqual(
      (await readAppIdentity(bundle)).fingerprint,
      first.fingerprint,
    );
    const alias = join(root, "alias.app");
    await symlink(bundle, alias);
    assert.equal(
      (await readAppIdentity(alias)).canonicalPath,
      first.canonicalPath,
    );
    await unlink(executable);
    await symlink(join(bundle, "Contents/Info.plist"), executable);
    await assert.rejects(readAppIdentity(bundle), {
      code: "appVerificationFailed",
    });
    for (const path of [
      "relative.app",
      "/tmp/invalid\0.app",
      "/" + "x".repeat(4097),
    ])
      await assert.rejects(readAppIdentity(path), {
        code: "appVerificationFailed",
      });
  } finally {
    await rm(root, { recursive: true });
  }
});
