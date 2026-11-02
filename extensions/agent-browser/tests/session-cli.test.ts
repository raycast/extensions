import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { executeSessionCLI } from "../src/lib/session-cli";

test(
  "CLI adapter uses argv and a supplied environment; tests execute only a disposable Node fixture",
  { skip: process.platform === "win32" },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "raycast-session-test-"));
    const fixture = path.join(directory, "fixture.cjs");
    const shim = path.join(directory, "fixture");
    await writeFile(
      fixture,
      "process.stdout.write(JSON.stringify({success:true,data:{args:process.argv.slice(2),fixture:process.env.FIXTURE}}));",
    );
    await writeFile(shim, `#!${process.execPath}\nrequire(${JSON.stringify(fixture)});\n`, { mode: 0o755 });
    try {
      const result = await executeSessionCLI(
        shim,
        ["--session", "fixture", "open", "https://example.com/?q=$(secret)"],
        { FIXTURE: "safe" },
        new AbortController().signal,
      );
      assert.deepEqual(result, {
        success: true,
        data: { args: ["--json", "--session", "fixture", "open", "https://example.com/?q=$(secret)"], fixture: "safe" },
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test("CLI adapter handles missing executable without echoing private output", async () => {
  await assert.rejects(
    executeSessionCLI(
      path.join(tmpdir(), "missing-raycast-session-test", "executable"),
      [],
      {},
      new AbortController().signal,
    ),
    /not found/,
  );
});

test("CLI adapter rejects already-cancelled work", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(executeSessionCLI("must-not-run", [], {}, controller.signal), { name: "AbortError" });
});

test(
  "CLI adapter handles malformed JSON, false success, failures, timeout and cancellation with safe errors",
  { skip: process.platform === "win32" },
  async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "raycast-session-test-"));
    const fixture = path.join(directory, "fixture");
    const cases = [
      ['process.stdout.write("private-cookie");', /unsupported JSON/],
      ['process.stdout.write(JSON.stringify({success:false,error:"private-cookie"}));', /unsupported JSON/],
      ['process.stderr.write("private-cookie");process.exit(1);', /failed/],
      ["setTimeout(()=>{}, 10000);", /timed out/],
    ] as const;
    try {
      for (const [source, expected] of cases) {
        await writeFile(fixture, `#!${process.execPath}\n${source}\n`, { mode: 0o755 });
        await assert.rejects(
          executeSessionCLI(fixture, [], {}, new AbortController().signal, 2_000),
          (error: Error) => expected.test(error.message) && !error.message.includes("private-cookie"),
        );
      }
      const controller = new AbortController();
      const promise = executeSessionCLI(fixture, [], {}, controller.signal);
      controller.abort();
      await assert.rejects(promise, { name: "AbortError" });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
