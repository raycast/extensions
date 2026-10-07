import assert from "node:assert/strict";
import { test } from "node:test";
import { runCoreCommand } from "../src/core-process";

test("whitespace around the Python preference does not prevent execution", async () => {
  const result = await runCoreCommand(` ${process.execPath} `, ["-e", "process.stdout.write('[]')"], {
    cwd: process.cwd(),
  });
  assert.equal(result, "[]");
});

test("library JSON larger than Node's default 1 MiB buffer is returned intact", async () => {
  const result = await runCoreCommand(process.execPath, ["-e", "process.stdout.write('x'.repeat(2 * 1024 * 1024))"], {
    cwd: process.cwd(),
  });
  assert.equal(result.length, 2 * 1024 * 1024);
});

test("a failed core command reports failure without including stderr secrets", async () => {
  await assert.rejects(
    runCoreCommand(process.execPath, ["-e", "console.error('private-config-value'); process.exit(1)"], {
      cwd: process.cwd(),
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /could not complete/);
      assert.doesNotMatch(error.message, /private-config-value/);
      return true;
    },
  );
});

test("an unresponsive command times out instead of leaving the list loading forever", async () => {
  await assert.rejects(
    runCoreCommand(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { cwd: process.cwd(), timeout: 100 }),
    /too long to respond/,
  );
});

test("a superseded search can cancel its subprocess", async () => {
  const controller = new AbortController();
  const result = runCoreCommand(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    cwd: process.cwd(),
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(result, { name: "AbortError" });
});

test("a missing interpreter gives a preference-specific error", async () => {
  await assert.rejects(
    runCoreCommand("/nonexistent/paper-agent/python", [], { cwd: process.cwd() }),
    /Check Config File Path and Python Executable/,
  );
});
