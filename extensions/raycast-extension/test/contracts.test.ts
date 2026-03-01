import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runNode(args: string[]): Promise<RunResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (code) => {
      resolvePromise({
        status: typeof code === "number" ? code : 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });
}

test("verify-contracts succeeds with current manifest", async () => {
  const result = await runNode([resolve("scripts/verify-contracts.mjs")]);
  assert.equal(result.status, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, "ok");
});

test("verify-contracts supports simulated mismatch failures", async () => {
  const result = await runNode([resolve("scripts/verify-contracts.mjs"), "--simulate-command-mismatch", "send"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /simulated command mismatch/i);
});
