import assert from "node:assert/strict";
import { test } from "node:test";
import { errorMessage, parseList, switchArgs } from "./ccswap.ts";

// Trimmed from real `ccswap list --json` output, with fake emails.
const LIST = JSON.stringify({
  claude: {
    schemaVersion: 1,
    activeAccountNumber: 1,
    accounts: [
      {
        number: 1,
        email: "a@example.com",
        organizationName: "Org A",
        active: true,
        usageStatus: "ok",
        usage: { fiveHour: { pct: 19, countdown: "1h 39m" }, sevenDay: { pct: 40, countdown: "2d 2h" } },
      },
      {
        number: 2,
        email: "b@example.com",
        alias: "work",
        active: false,
        usageStatus: "token_expired",
        usage: null,
        lastGoodUsage: { fiveHour: { pct: 5 } },
      },
    ],
  },
  codex: { provider: "codex", activeAccountNumber: null, accounts: [] },
});

test("parseList reads both providers and falls back to last good usage", () => {
  const out = parseList(LIST);
  assert.equal(out.claude.length, 2);
  assert.equal(out.claude[0].usage?.sevenDay?.pct, 40);
  assert.equal(out.claude[1].usage?.fiveHour?.pct, 5);
  assert.deepEqual(out.codex, []);
});

test("parseList tolerates a missing codex section", () => {
  assert.deepEqual(parseList(JSON.stringify({ claude: { schemaVersion: 1, accounts: [] } })).codex, []);
});

test("parseList rejects an unknown schema and surfaces CLI errors", () => {
  assert.throws(() => parseList(JSON.stringify({ claude: { schemaVersion: 2, accounts: [] } })), /schema 2/);
  assert.throws(() => parseList(JSON.stringify({ schemaVersion: 1, error: { message: "boom" } })), /boom/);
});

test("errorMessage prefers the JSON envelope, then stderr", () => {
  assert.equal(errorMessage('{"error":{"message":"nope"}}', "x"), "nope");
  assert.equal(errorMessage("plain", " bad \n"), "bad");
  assert.equal(errorMessage("", ""), undefined);
});

test("switchArgs builds Claude and Codex commands", () => {
  assert.deepEqual(switchArgs("claude"), ["switch", "--strategy", "best", "--json"]);
  assert.deepEqual(switchArgs("codex", 2), ["codex", "switch", "2", "--json"]);
});
