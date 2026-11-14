import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createTokenLock } from "../src/lib/oauth-lock";

const exec = promisify(execFile);
test("separate command processes refresh shared tokens only once", { timeout: 15000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "revenuecat-oauth-test-"));
  try {
    await writeFile(
      join(directory, "tokens.json"),
      JSON.stringify({ accessToken: "expired", refreshToken: "original" }),
    );
    const run = () =>
      exec(
        process.execPath,
        ["--import", "tsx", fileURLToPath(new URL("./fixtures/oauth-reader.ts", import.meta.url)), directory],
        { timeout: 10000 },
      );
    const results = await Promise.all([run(), run()]);
    assert.deepEqual(
      results.map((result) => result.stdout),
      ["replacement", "replacement"],
    );
    assert.equal(await readFile(join(directory, "exchanges"), "utf8"), "refresh\n");
    assert.deepEqual(JSON.parse(await readFile(join(directory, "tokens.json"), "utf8")), {
      accessToken: "replacement",
      refreshToken: "rotated",
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("failed work releases the shared lock for another command", async () => {
  const directory = await mkdtemp(join(tmpdir(), "revenuecat-oauth-test-"));
  try {
    await assert.rejects(
      createTokenLock(directory)(async () => {
        throw new Error("Network failure");
      }),
      /Network failure/,
    );
    assert.equal(await createTokenLock(directory)(async () => "retry"), "retry");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
