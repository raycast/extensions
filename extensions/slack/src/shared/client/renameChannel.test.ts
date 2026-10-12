import assert from "node:assert/strict";
import test from "node:test";
import { normalizeChannelName, parseChannelId, renameChannel } from "./renameChannel";

test("normalizes names like Slack's rename dialog", () => {
  assert.equal(normalizeChannelName("#Launch Plan"), "launch-plan");
  assert.equal(normalizeChannelName("  proj_x-2026  "), "proj_x-2026");
  assert.equal(normalizeChannelName("Q4   Roadmap"), "q4-roadmap");
});

test("rejects empty and overlong names before calling Slack", () => {
  assert.throws(() => normalizeChannelName("  # "), /Provide a new channel name/);
  assert.throws(() => normalizeChannelName("a".repeat(81)), /80 characters/);
});

test("accepts channel IDs and rejects user, DM, and malformed IDs", () => {
  assert.equal(parseChannelId(" C12345678 "), "C12345678");
  assert.equal(parseChannelId("G12345678"), "G12345678");
  for (const id of ["U12345678", "D12345678", "#general", ""]) {
    assert.throws(() => parseChannelId(id), /Invalid Slack channel ID/);
  }
});

test("renames with the normalized name and returns Slack's result", async () => {
  const result = await renameChannel("C12345678", "#New Name", async (args) => {
    assert.deepEqual(args, { channel: "C12345678", name: "new-name" });
    return { ok: true, channel: { id: "C12345678", name: "new-name" } };
  });
  assert.deepEqual(result, { channel: "C12345678", name: "new-name" });
});

test("maps thrown Slack platform errors to actionable messages", async () => {
  await assert.rejects(
    renameChannel("C12345678", "taken", async () => {
      throw Object.assign(new Error("An API error occurred: name_taken"), { data: { error: "name_taken" } });
    }),
    /already uses this name.*\(name_taken\)/,
  );
});

test("surfaces unknown error codes and error responses", async () => {
  await assert.rejects(
    renameChannel("C12345678", "x", async () => ({ ok: false, error: "ratelimited" })),
    /^Error: ratelimited$/,
  );
  await assert.rejects(
    renameChannel("C12345678", "x", async () => ({ ok: false, error: "not_authorized" })),
    /not allowed to rename/,
  );
});
