import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { readContext } from "../src/lib/corpus";
import { session } from "./fixtures";

const dir = mkdtempSync(join(tmpdir(), "agent-sessions-"));
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));

let counter = 0;

/** Writes a transcript and returns a session pointing at it. */
function transcript(agent: "claude" | "codex", records: unknown[]) {
  const file = join(dir, `${agent}-${counter++}.jsonl`);
  writeFileSync(file, records.map((r) => `${JSON.stringify(r)}\n`).join(""));
  return session({ agent, file });
}

function claudeText(role: "user" | "assistant", text: string) {
  return { type: role, message: { content: [{ type: "text", text }] } };
}

function codexText(role: "user" | "assistant", text: string) {
  const type = role === "user" ? "input_text" : "output_text";
  return {
    type: "message",
    payload: { type: "message", role, content: [{ type, text }] },
  };
}

test("the window is the target message plus its neighbours", () => {
  const s = transcript("claude", [
    claudeText("user", "zero"),
    claudeText("assistant", "one"),
    claudeText("user", "two"),
    claudeText("assistant", "three"),
    claudeText("user", "four"),
  ]);
  const window = readContext(s, 2, 1, 1);
  assert.deepEqual(
    window.map((m) => m.text),
    ["one", "two", "three"],
  );
});

test("each message reports the role it came from", () => {
  const s = transcript("claude", [
    claudeText("user", "asked"),
    claudeText("assistant", "answered"),
  ]);
  assert.deepEqual(
    readContext(s, 0, 0, 1).map((m) => m.fromUser),
    [true, false],
  );
});

test("the window is clipped at both ends of the transcript", () => {
  const s = transcript("claude", [
    claudeText("user", "zero"),
    claudeText("assistant", "one"),
  ]);
  assert.deepEqual(
    readContext(s, 0, 5, 5).map((m) => m.text),
    ["zero", "one"],
  );
});

test("messages keep their newlines and fences", () => {
  const text = "Try:\n\n```ts\nconst a = 1;\n```";
  const s = transcript("claude", [claudeText("assistant", text)]);
  assert.equal(readContext(s, 0, 0, 0)[0].text, text);
});

test("seq counts only the messages the indexer numbers", () => {
  // Scaffolding and empty messages consume no seq, so a window that counted
  // them would open on the wrong message. Nothing outside can catch that: the
  // pane would show plausible text either way.
  const s = transcript("claude", [
    claudeText("user", "<system-reminder>ignore me</system-reminder>"),
    claudeText("user", "first real"),
    claudeText("assistant", "   \n  "),
    { type: "user", message: { content: [] } },
    claudeText("assistant", "second real"),
  ]);
  assert.deepEqual(
    readContext(s, 0, 0, 1).map((m) => m.text),
    ["first real", "second real"],
  );
});

test("a sidechain message is not numbered either", () => {
  const s = transcript("claude", [
    claudeText("user", "main"),
    { ...claudeText("assistant", "subagent chatter"), isSidechain: true },
    claudeText("assistant", "reply"),
  ]);
  assert.deepEqual(
    readContext(s, 1, 0, 0).map((m) => m.text),
    ["reply"],
  );
});

test("codex transcripts read the same way", () => {
  const s = transcript("codex", [
    { type: "session_meta", payload: { cwd: "/tmp", id: "abc" } },
    codexText("user", "zero"),
    codexText("assistant", "one"),
    codexText("user", "two"),
  ]);
  assert.deepEqual(
    readContext(s, 1, 1, 1).map((m) => m.text),
    ["zero", "one", "two"],
  );
});

test("codex messages report the role they came from", () => {
  // fromUser is the only input to the turn rule, so a broken Codex mapping
  // renders every Codex pane as one undifferentiated speaker.
  const s = transcript("codex", [
    { type: "session_meta", payload: { cwd: "/tmp", id: "abc" } },
    codexText("user", "asked"),
    codexText("assistant", "answered"),
    codexText("user", "asked again"),
  ]);
  assert.deepEqual(
    readContext(s, 1, 1, 1).map((m) => m.fromUser),
    [true, false, true],
  );
});

test("a seq past the end of the transcript yields nothing", () => {
  const s = transcript("claude", [claudeText("user", "only")]);
  assert.deepEqual(readContext(s, 99, 2, 2), []);
});

test("a missing transcript yields nothing rather than throwing", () => {
  const s = session({ file: join(dir, "does-not-exist.jsonl") });
  assert.deepEqual(readContext(s, 0, 2, 2), []);
});

test("the hit's own message keeps far more of itself than its neighbours", () => {
  // A hit records the seq of its message, not which chunk matched, so a match
  // late in a long message sits thousands of characters in. Cutting the target
  // at the neighbour's limit put the matched text past the ellipsis, and the
  // row's subtitle is hidden while the pane is open, so it was nowhere at all.
  const long = "x".repeat(40_000);
  const s = transcript("claude", [
    claudeText("user", long),
    claudeText("assistant", long),
  ]);
  const [target, neighbour] = readContext(s, 0, 0, 1);
  // Pinned in both directions: a cap that silently grew would flood the pane,
  // and one that shrank would hide the match again.
  assert.equal(target.text.length, 24_001);
  assert.equal(neighbour.text.length, 4_001);
  assert.ok(target.text.endsWith("…"));
  assert.ok(neighbour.text.endsWith("…"));
});

test("a message under the limit is not truncated at all", () => {
  const text = "y".repeat(3_999);
  const s = transcript("claude", [
    claudeText("user", "hit"),
    claudeText("assistant", text),
  ]);
  assert.equal(readContext(s, 0, 0, 1)[1].text, text);
});

test("truncation leaves no whitespace standing before the ellipsis", () => {
  // The blank run straddles the 4000-character cut, where the mark would
  // otherwise land a line below the text it truncates.
  const padded = `${"y".repeat(3_995)}\n\n   ${"z".repeat(100)}`;
  const s = transcript("claude", [
    claudeText("user", "hit"),
    claudeText("assistant", padded),
  ]);
  assert.equal(readContext(s, 0, 0, 1)[1].text, `${"y".repeat(3_995)}…`);
});

test("truncation never splits a surrogate pair", () => {
  // Slicing by code unit through an emoji leaves an unpaired half, which
  // renders as U+FFFD immediately before the ellipsis.
  const straddling = `${"a".repeat(3_999)}🚀${"b".repeat(100)}`;
  const s = transcript("claude", [
    claudeText("user", "hit"),
    claudeText("assistant", straddling),
  ]);
  const [, neighbour] = readContext(s, 0, 0, 1);
  assert.ok(!neighbour.text.includes("\uFFFD"));
  // The pair is dropped whole rather than halved.
  assert.equal(neighbour.text, `${"a".repeat(3_999)}…`);
});
