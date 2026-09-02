import assert from "node:assert/strict";
import test from "node:test";
import {
  canRevalidateMintCLI,
  escapeMarkdown,
  formatSignedBytes,
  isCompatibleMintCLIVersion,
  parseJSON,
  parseMintCommandJSON,
  shortPath,
  type MintCLIVersion,
} from "../src/mint-cli.ts";

const compatibleVersion: MintCLIVersion = {
  product: "Mint",
  appVersion: "1.0.10",
  appBuild: "16",
  schemaVersion: 2,
  capabilities: ["scan-lite.v1", "scan.v1", "status.v1", "why.v1"],
};

test("accepts the current Mint CLI compatibility contract", () => {
  assert.equal(isCompatibleMintCLIVersion(compatibleVersion), true);
  assert.equal(isCompatibleMintCLIVersion({ ...compatibleVersion, schemaVersion: 0 }), false);
  assert.equal(isCompatibleMintCLIVersion({ ...compatibleVersion, capabilities: ["status.v1"] }), false);
});

test("parses valid JSON and rejects malformed output", () => {
  assert.deepEqual(parseJSON<{ ok: boolean }>('{"ok":true}'), { ok: true });
  assert.equal(parseJSON("not JSON"), undefined);
});

test("accepts only schema-2 output for the expected command capability", () => {
  const scan = JSON.stringify({ schemaVersion: 2, capability: "scan-lite.v1", items: [] });
  const status = JSON.stringify({ schemaVersion: 2, capability: "status.v1", trend: [] });
  const why = JSON.stringify({ schemaVersion: 2, capability: "why.v1", analysis: "growth" });

  assert.deepEqual(parseMintCommandJSON<{ items: unknown[] }>(scan, "scan-lite.v1")?.items, []);
  assert.deepEqual(parseMintCommandJSON<{ trend: unknown[] }>(status, "status.v1")?.trend, []);
  assert.equal(parseMintCommandJSON<{ analysis: string }>(why, "why.v1")?.analysis, "growth");
  assert.equal(parseMintCommandJSON(scan, "status.v1"), undefined);
  assert.equal(parseMintCommandJSON('{"schemaVersion":1,"capability":"status.v1"}', "status.v1"), undefined);
  assert.equal(parseMintCommandJSON('{"schemaVersion":2}', "why.v1"), undefined);
});

test("shortens only the home directory and its descendants", () => {
  assert.equal(shortPath("/Users/tester", "/Users/tester"), "~");
  assert.equal(shortPath("/Users/tester/Documents/a.txt", "/Users/tester"), "~/Documents/a.txt");
  assert.equal(shortPath("/Users/tester2/Documents/a.txt", "/Users/tester"), "/Users/tester2/Documents/a.txt");
});

test("formats signed byte deltas and escapes local labels for markdown", () => {
  assert.equal(formatSignedBytes(1_048_576), "+1.0 MB");
  assert.equal(formatSignedBytes(-1_048_576), "−1.0 MB");
  assert.equal(formatSignedBytes(0), "0 B");
  assert.equal(escapeMarkdown("Build | cache\nnext"), "Build \\| cache next");
});

test("revalidates only the same freshly trusted CLI path", () => {
  const trusted = {
    status: "ready" as const,
    path: "/Applications/Mint.app/Contents/Resources/mint-cli",
    version: compatibleVersion,
  };
  assert.equal(canRevalidateMintCLI(trusted.path, trusted), true);
  assert.equal(canRevalidateMintCLI(trusted.path, { ...trusted, path: "/opt/homebrew/bin/mint-cli" }), false);
  assert.equal(canRevalidateMintCLI(trusted.path, { status: "untrusted" }), false);
  assert.equal(canRevalidateMintCLI(undefined, trusted), false);
});
