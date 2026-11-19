const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const binary = process.env.TUPLE_CANONICAL_CLI;
if (!binary) throw new Error("Set TUPLE_CANONICAL_CLI to the actual canonical CLI binary.");
const load = require("./load-typescript.cjs")(binary);
const tuple = load("src/lib/tuple.ts");
const voiceNotes = load("src/lib/voice-notes.ts");
const fixture = fs.readFileSync(path.join(__dirname, "fixtures/capture.jsonl"), "utf8");
const records = fixture.trim().split("\n").map(JSON.parse);
const scratch = fs.mkdtempSync("/tmp/raycast-cli-");
const socket = path.join(scratch, "tuple.sock");
const previousHost = process.env.TUPLE_HOST;
const requests = [];
let voiceEnabled = true;
let disableDuringRead = false;
const note = {
  id: "note-id", direction: "received", person: { id: 7, full_name: "Riley Chen", email: "riley@example.com" },
  sent_at: "2026-11-09T10:00:00Z", duration_ms: 32_000, heard: false, state: "ready", transcript: null,
};
const storedCall = {
  call_id: "call-id",
  title: "Migration",
  summary: "Review the migration",
  recordings: 1,
  segments: 1,
  started_at: "2026-06-20T10:00:00.000Z",
  ended_at: "2026-06-20T10:30:00.000Z",
  participants: [{ id: 7, full_name: "Riley Chen", email: "riley@example.com" }],
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://tuple");
  requests.push(url);
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/capabilities") return res.end(JSON.stringify({ participation: "attached", available: voiceEnabled ? ["voice_notes"] : [] }));
  if (url.pathname.startsWith("/voice-notes")) {
    if (disableDuringRead) voiceEnabled = false;
    if (!voiceEnabled) {
      res.statusCode = 403;
      return res.end(JSON.stringify({ kind: "capability_unavailable", error: "Voice notes are disabled" }));
    }
    return res.end(JSON.stringify(url.pathname.endsWith("/transcript") ? { id: note.id, state: "done", text: "Meet at noon." } : [note]));
  }
  if (url.pathname === "/recording/calls") return res.end(JSON.stringify([storedCall]));
  if (url.pathname === "/call/call-id/recording") return res.end(fixture);
  if (url.pathname === "/call/call-id")
    return res.end(
      JSON.stringify({
        id: "call-id",
        state: "ended",
        participants: storedCall.participants,
        title: storedCall.title,
        summary: storedCall.summary,
        started_at: storedCall.started_at,
        ended_at: storedCall.ended_at,
      }),
    );
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Unexpected test route", kind: "not_found" }));
});
test.before(async () => {
  await new Promise((resolve) => server.listen(socket, resolve));
  process.env.TUPLE_HOST = socket;
});
test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  if (previousHost === undefined) delete process.env.TUPLE_HOST;
  else process.env.TUPLE_HOST = previousHost;
  fs.rmSync(scratch, { recursive: true, force: true });
});

test("actual CLI emits complete Capture NDJSON and canonical metadata", async () => {
  const actual = await tuple.getCapture("call-id");
  assert.deepEqual(actual, records);
  const metadata = await tuple.getCall("call-id");
  assert.equal(metadata.id, "call-id");
  assert.equal(metadata.summary, storedCall.summary);
});

test("actual CLI exports complete default and transcript-only artifacts", async () => {
  const complete = path.join(scratch, "complete.jsonl");
  const transcript = path.join(scratch, "transcript.jsonl");
  const receipt = await tuple.exportCapture(complete, "call-id");
  assert.equal(receipt.file, complete);
  assert.equal(receipt.records, 3);
  const full = fs.readFileSync(complete, "utf8").trim().split("\n").map(JSON.parse);
  assert.deepEqual(
    full.map((r) => r.category),
    ["events", "transcript", "content"],
  );
  assert.ok(full.every((r) => r.call_id === "call-id"));
  const selected = await tuple.exportCapture(transcript, "call-id", true);
  assert.equal(selected.records, 1);
  const spoken = JSON.parse(fs.readFileSync(transcript, "utf8").trim());
  assert.equal(spoken.category, "transcript");
  assert.equal(spoken.data.text, records[1].data.text);
});

test("actual CLI composes recent-call filters in its store request", async () => {
  await tuple.listRecordedCalls({ participant: "Riley", limit: 10 });
  const url = requests.at(-1);
  assert.equal(url.pathname, "/recording/calls");
  assert.equal(url.searchParams.get("participant"), "Riley");
  assert.equal(url.searchParams.get("limit"), "10");
});

test("actual CLI supplies operating guides rather than bootstrap pointers alone", async () => {
  const guide = await tuple.runTuple(["agent", "guide", "call-content"]);
  assert.ok(guide.includes("transcription_finished"));
  assert.ok(guide.includes("agent_prompt"));
});

test("actual CLI voice-note discovery, reads, and disable race fail closed", async () => {
  assert.equal(await voiceNotes.voiceNotesAvailable(), true);
  assert.deepEqual(await voiceNotes.listVoiceNotes("unheard"), [note]);
  const listRequest = requests.find((url) => url.pathname === "/voice-notes");
  assert.equal(listRequest.searchParams.get("direction"), "received");
  assert.equal(listRequest.searchParams.get("unheard"), "true");
  assert.deepEqual(await voiceNotes.getVoiceNoteTranscript(note.id), { id: note.id, state: "done", text: "Meet at noon." });
  disableDuringRead = true;
  assert.equal(await voiceNotes.listVoiceNotes(), null);
  assert.equal(await voiceNotes.voiceNotesAvailable(), false);
  const reads = requests.filter((url) => url.pathname.startsWith("/voice-notes")).length;
  assert.equal(await voiceNotes.getVoiceNoteTranscript(note.id), null);
  assert.equal(requests.filter((url) => url.pathname.startsWith("/voice-notes")).length, reads);
});
