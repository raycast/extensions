import assert from "node:assert/strict";
import { test } from "node:test";
import { run } from "../src/process";

test(
  "Windows cancellation terminates a spawned conversion child too",
  { skip: process.platform !== "win32" },
  async () => {
    const controller = new AbortController();
    let descendant: number | undefined;
    const source =
      "const { spawn } = require('node:child_process'); const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio:'ignore',windowsHide:true}); console.log(child.pid); setInterval(() => {}, 1000);";
    try {
      await assert.rejects(
        run(process.execPath, ["-e", source], {
          signal: controller.signal,
          timeout: 10000,
          onLine: (line) => {
            descendant = Number(line);
            controller.abort();
          },
        }),
        /canceled/,
      );
      assert.ok(descendant);
      assert.throws(() => process.kill(descendant!, 0), { code: "ESRCH" });
    } finally {
      if (descendant) {
        try {
          process.kill(descendant);
        } catch {
          /* Already terminated. */
        }
      }
    }
  },
);

test("runner preserves argument boundaries and reads split lines", async () => {
  const lines: string[] = [];
  const output = await run(
    process.execPath,
    [
      "-e",
      "process.stdout.write(process.argv[1] + '\\n'); process.stdout.write('tail')",
      "path with spaces & symbols",
    ],
    { onLine: (line) => lines.push(line) },
  );
  assert.equal(output, "path with spaces & symbols\ntail");
  assert.deepEqual(lines, ["path with spaces & symbols", "tail"]);
});
test("runner reports missing executables and nonzero stderr", async () => {
  await assert.rejects(
    run("nonexistent-social-downloader-test.exe", []),
    /Program not found/,
  );
  await assert.rejects(
    run(process.execPath, [
      "-e",
      "process.stderr.write('fixture error'); process.exit(2)",
    ]),
    /fixture error/,
  );
});
test("runner supports timeout and cancellation", async () => {
  await assert.rejects(
    run(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      timeout: 200,
    }),
    /timed out/,
  );
  const controller = new AbortController();
  const result = run(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    signal: controller.signal,
  });
  setTimeout(() => controller.abort(), 200);
  await assert.rejects(result, /canceled/);
  await assert.rejects(
    run(process.execPath, [], { signal: controller.signal }),
    /canceled/,
  );
});
