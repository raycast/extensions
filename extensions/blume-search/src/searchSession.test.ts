import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { BlumeSearchClient, SearchSupersededError } from "./helperProcessClient.ts";
import { BlumeSearchSession } from "./searchSession.ts";

const input = { query: "project", categories: ["projects"] as ["projects"] };
const responder = `process.stdin.on("data", (chunk) => {
  const request = JSON.parse(String(chunk));
  process.stdout.write(JSON.stringify({version: 1, type: "search-result", id: request.id,
    ok: true, page: {results: [], truncated: false}}) + "\\n");
});`;
const ready = `process.stdout.write(JSON.stringify({version: 1, type: "ready", supportedVersions: [1]}) + "\\n");`;

for (const [failure, behavior, error] of [
  ["malformed response", `process.stdin.once("data", () => process.stdout.write("null\\n"));`, /invalid response/],
  ["exit", `process.stdin.once("data", () => process.exit(1));`, /exited/],
  ["timeout", `process.stdin.resume();`, /timed out/],
] as const) {
  test(`next query starts a new helper after ${failure}, without an automatic retry loop`, async () => {
    const directory = mkdtempSync(join(tmpdir(), "blume-raycast-recovery-"));
    const script = join(directory, "helper.mjs");
    let starts = 0;
    const session = new BlumeSearchSession(() => {
      writeFileSync(script, ready + (starts++ === 0 ? behavior : responder));
      return new BlumeSearchClient({ command: process.execPath, args: [script], env: process.env }, "blume-canary");
    });
    try {
      await session.ready();
      await assert.rejects(session.search(input), error);
      assert.equal(starts, 1);
      assert.deepEqual(await session.search(input), { results: [], truncated: false });
      assert.equal(starts, 2);
      assert.equal(session.deepLinkProtocol, "blume-canary");
      await session.search(input);
      assert.equal(starts, 2);
    } finally {
      session.dispose();
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

test("queries share helper startup and only the latest query reaches it", async () => {
  const directory = mkdtempSync(join(tmpdir(), "blume-raycast-startup-"));
  const script = join(directory, "helper.mjs");
  writeFileSync(script, `setTimeout(() => { ${ready} }, 50);` + responder);
  let starts = 0;
  const session = new BlumeSearchSession(() => {
    starts++;
    return new BlumeSearchClient({ command: process.execPath, args: [script], env: process.env });
  });
  try {
    const first = assert.rejects(session.search(input), SearchSupersededError);
    const second = session.search({ ...input, query: "latest" });
    await first;
    assert.deepEqual(await second, { results: [], truncated: false });
    assert.equal(starts, 1);
  } finally {
    session.dispose();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("disposing during startup closes the helper and prevents later restarts", async () => {
  let client: BlumeSearchClient | undefined;
  const session = new BlumeSearchSession(() => {
    client = new BlumeSearchClient({
      command: process.execPath,
      args: ["-e", "process.stdin.resume()"],
      env: process.env,
    });
    return client;
  });
  const pending = assert.rejects(session.search(input), /closed|superseded/i);
  session.dispose();
  await pending;
  assert.equal(client?.isClosed, true);
  await assert.rejects(session.search(input), /closed/i);
});
