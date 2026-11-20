const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tuple-raycast-test-"));
const binary = path.join(scratch, "tuple");
const log = path.join(scratch, "args.jsonl");
const fixture = fs.readFileSync(path.join(__dirname, "fixtures/capture.jsonl"), "utf8");
const records = fixture.trim().split("\n").map(JSON.parse);
const load = require("./load-typescript.cjs")(binary);
const tuple = load("src/lib/tuple.ts");
const voiceNotes = load("src/lib/voice-notes.ts");
const { escapeMarkdownText } = load("src/lib/capture.ts");
const { TupleErrorKind, contactCallAction, machineCallAction, primaryPersonalRoom, callPeople } = load("src/lib/types.ts");
function fake(body) {
  fs.writeFileSync(log, "");
  fs.writeFileSync(
    binary,
    `#!${process.execPath}\nconst fs = require('node:fs');\nconst args = process.argv.slice(2);\nfs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args)+'\\n');\n${body}`,
    { mode: 0o700 },
  );
}
function calls() {
  return fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}
test.after(() => fs.rmSync(scratch, { recursive: true, force: true }));

test("canonical mutations use one path and preserve argument values", async () => {
  fake("process.stdout.write('{}');");
  await tuple.startCall("person@example.com");
  await tuple.addToCall("person@example.com");
  await tuple.removeFromCall("person@example.com");
  await tuple.joinCall("person@example.com");
  await tuple.joinRoom("room-slug");
  await tuple.hangUpCall();
  await tuple.startCapture();
  await tuple.stopCapture();
  await tuple.setCallMetadata("call-id", { title: "--title 'quoted' $(not-a-shell)", summary: "" });
  await tuple.deleteCapture("call-id");
  assert.deepEqual(
    calls().map((args) => args.slice(2)),
    [
      ["call", "start", "person@example.com"],
      ["call", "participants", "add", "person@example.com", "--wait", "--timeout", "12s"],
      ["call", "participants", "remove", "person@example.com"],
      ["call", "join", "person@example.com"],
      ["state"],
      ["rooms", "join", "room-slug"],
      ["call", "leave"],
      ["capture", "start"],
      ["capture", "stop"],
      ["call", "edit", "call-id", "--title", "--title 'quoted' $(not-a-shell)", "--summary", ""],
      ["capture", "delete", "call-id"],
    ],
  );
  assert.ok(calls().every((args) => args[0] === "--format" && args[1] === "json"));
});

test("call starts support current CLI flags and wait beyond the read timeout", async () => {
  const machine = "0f1c0000-0000-4000-8000-000000000001";
  fake(
    `if (args.includes('--wait') || args.includes('--timeout')) {
      process.stderr.write('{"error":"unknown flag: --wait"}');
      process.exitCode = 1;
    } else {
      setTimeout(() => process.stdout.write('{"id":"call-id"}'), args.at(-1) === ${JSON.stringify(machine)} ? 0 : 16_000);
    }`,
  );
  await tuple.startCall("person@example.com");
  await tuple.startCall(machine);
  assert.deepEqual(calls(), [
    ["--format", "json", "call", "start", "person@example.com"],
    ["--format", "json", "call", "start", machine],
  ]);
});

test("joining switches only after an already-on-call error and explicit confirmation", async () => {
  let approved = false;
  let confirmations = 0;
  const join = require("./load-typescript.cjs")(binary, {
    "@raycast/api": {
      getPreferenceValues: () => ({ tuplePath: binary }),
      Alert: { ActionStyle: { Destructive: "destructive" } },
      confirmAlert: async () => { confirmations++; return approved; },
    },
  })("src/lib/tuple.ts");
  fake(`if (args.includes('--switch')) process.stdout.write('{}'); else { process.stderr.write('{"kind":"already_on_call","error":"Already on a call","error_code":409}'); process.exitCode = 1; }`);
  assert.equal(await join.joinCall("person@example.com"), false);
  assert.equal(calls().length, 1);
  approved = true;
  assert.equal(await join.joinCall("person@example.com"), true);
  assert.deepEqual(calls().at(-1), ["--format", "json", "call", "join", "person@example.com", "--switch"]);
  assert.equal(confirmations, 2);
  fake(`process.stderr.write('{"kind":"call_full","error":"Call is full","error_code":409}'); process.exitCode = 1;`);
  await assert.rejects(join.joinCall("person@example.com"), (error) => error.kind === TupleErrorKind.NotJoinable);
  assert.equal(confirmations, 2);
  assert.equal(calls().length, 1);
  fake(`process.stdout.write('{"in_call":true,"call":{"active_room_slug":"current-room"}}');`);
  assert.equal(await join.joinRoom("current-room"), true);
  assert.deepEqual(calls(), [["--format", "json", "state"]]);
});

test("search forwards arbitrary literal input intact after the option terminator", async () => {
  fake("process.stdout.write('[]');");
  for (const query of ['C++: "unterminated OR NOT', "--limit -1; $(touch nope)", "  foo.bar?!  "]) {
    await tuple.searchCapture(query, { participant: "Riley", limit: 25 });
    assert.deepEqual(calls().at(-1), [
      "--format",
      "json",
      "capture",
      "search",
      "--kind",
      "all",
      "--limit",
      "25",
      "--participant",
      "Riley",
      "--",
      query,
    ]);
  }
  await tuple.searchCapture("   ");
  assert.equal(calls().length, 3);
});

test("stderr structured failures win over stdout and prose is never classified", async () => {
  fake(
    `process.stdout.write('{"kind":"contact_offline","error":"wrong stream"}'); process.stderr.write('{"kind":"contact_busy","error":"Already busy","error_code":409}'); process.exitCode=1;`,
  );
  await assert.rejects(
    tuple.startCall("person@example.com"),
    (error) => error.kind === TupleErrorKind.ContactBusy && error.message === "Already busy",
  );
  for (const stderr of [
    "not in a call",
    '{"error":"not in a call"}',
    '{"error":"transcription store unavailable","error_code":503}',
    "{bad json",
  ]) {
    assert.equal(tuple.classifyError({ stderr }).kind, TupleErrorKind.Unknown);
  }
  assert.equal(tuple.classifyError({ code: "ENOENT" }).kind, TupleErrorKind.NotInstalled);
  assert.equal(
    tuple.classifyError({ stderr: '{"kind":"no_active_call","error":"idle"}' }).kind,
    TupleErrorKind.NoActiveCall,
  );
  assert.equal(
    tuple.classifyError({ stderr: '{"kind":"daemon_down","error":"offline"}' }).kind,
    TupleErrorKind.DaemonDown,
  );
  assert.equal(
    tuple.classifyError({ stderr: '{"kind":"transcription_unavailable","error":"empty"}' }).kind,
    TupleErrorKind.CaptureUnavailable,
  );
  const unavailable = tuple.classifyError({ stderr: '{"kind":"not_connected","error":"Connection suspended","error_code":409}' });
  assert.equal(unavailable.kind, TupleErrorKind.Unknown);
  assert.equal(unavailable.cliKind, "not_connected");
  assert.equal(unavailable.status, 409);
  assert.equal(unavailable.message, "Connection suspended");
});

test("unanswered calls report the CLI failure without retrying", async () => {
  fake(`process.stderr.write('{"kind":"call_ended","error":"Person did not connect"}'); process.exitCode=2;`);
  await assert.rejects(tuple.startCall("person@example.com"), /Person did not connect/);
  assert.equal(calls().length, 1);
});

test("voice notes stay hidden when the CLI does not advertise the capability", async () => {
  fake(`process.stdout.write('Available Commands:\\n  call  Call lifecycle\\n');`);
  assert.equal(await voiceNotes.voiceNotesAvailable(), false);
  assert.equal(await voiceNotes.listVoiceNotes(), null);
  assert.equal(await voiceNotes.getVoiceNoteTranscript("note-id"), null);
  assert.ok(calls().every((args) => !args.includes("voice-notes")));
});

test("voice note reads preserve filters, metadata, and transcript text", async () => {
  const note = {
    id: "note-id",
    direction: "received",
    person: { id: 7, full_name: "Riley Chen", email: "riley@example.com" },
    sent_at: "2026-11-09T10:00:00Z",
    duration_ms: 32_000,
    heard: false,
    state: "ready",
    transcript: null,
  };
  fake(`process.stdout.write(args.includes('--help') ? '  voice-notes   Voice notes\\n' : args.includes('transcript') ? JSON.stringify({id:'note-id',state:'done',text:'Lunch at noon?'}) : ${JSON.stringify(JSON.stringify([note]))});`);
  for (const filter of ["received", "sent", "unheard", "all"]) {
    assert.deepEqual(await voiceNotes.listVoiceNotes(filter), [note]);
  }
  assert.deepEqual(await voiceNotes.getVoiceNoteTranscript("note-id"), {
    id: "note-id", state: "done", text: "Lunch at noon?",
  });
  assert.deepEqual(calls().filter((args) => args.includes("voice-notes")), [
    ["--format", "json", "voice-notes", "list", "--received"],
    ["--format", "json", "voice-notes", "list", "--sent"],
    ["--format", "json", "voice-notes", "list", "--received", "--unheard"],
    ["--format", "json", "voice-notes", "list"],
    ["--format", "json", "voice-notes", "transcript", "note-id", "--timeout", "2m"],
  ]);
});

test("voice notes disappear without errors when disabled or removed between discovery and use", async () => {
  const removed = path.join(scratch, "voice-notes-removed");
  for (const error of [
    { kind: "capability_unavailable", error: "Voice notes are disabled" },
    { error: 'unknown command "voice-notes" for "tuple"' },
  ]) {
    fs.rmSync(removed, { force: true });
    fake(`if (args.includes('--help')) {
      process.stdout.write(fs.existsSync(${JSON.stringify(removed)}) ? '  call  Calls\\n' : '  voice-notes  Voice notes\\n');
    } else {
      fs.writeFileSync(${JSON.stringify(removed)}, 'removed');
      process.stderr.write(${JSON.stringify(JSON.stringify(error))}); process.exitCode = 1;
    }`);
    assert.equal(await voiceNotes.listVoiceNotes(), null);
  }
});

test("available voice notes keep empty lists distinct from absence and surface real failures", async () => {
  fake(`process.stdout.write(args.includes('--help') ? '  voice-notes  Voice notes\\n' : 'null');`);
  assert.deepEqual(await voiceNotes.listVoiceNotes(), []);
  fake(`if (args.includes('--help')) process.stdout.write('  voice-notes  Voice notes\\n'); else { process.stderr.write('{"kind":"other_mac","error":"Encrypted for another Mac"}'); process.exitCode = 1; }`);
  await assert.rejects(voiceNotes.getVoiceNoteTranscript("note-id"), /Encrypted for another Mac/);
  fake(`process.stdout.write(args.includes('--help') ? '  voice-notes  Voice notes\\n' : '{"id":"note-id","state":"transcribing"}');`);
  await assert.rejects(voiceNotes.getVoiceNoteTranscript("note-id"), /incomplete voice note transcript/);
});

test("complete Capture NDJSON and clock rendering retain all categories", async () => {
  fake(`process.stdout.write(${JSON.stringify(fixture)});`);
  assert.deepEqual(await tuple.getCapture("call-id"), records);
  const compact = await tuple.getLocalClockCapture("call-id");
  const clock = (instant) => new Date(instant).toLocaleTimeString(undefined, { hour12: false });
  assert.deepEqual(compact.split("\n"), [
    `[${clock(records[0].time)}] Riley Chen joined`,
    `[${clock(records[1].data.start)}] Riley Chen: Check C++: launch OR retry --flag?`,
    `[${clock(records[2].time)}] Riley Chen shared Editor: migration.ts — https://example.com/migration`,
  ]);
  const illustrated = await tuple.getLocalClockCaptureMarkdown("call-id");
  assert.deepEqual(illustrated.split("\n"), [
    `⚡️ [${clock(records[0].time)}] Riley Chen joined`,
    `💬 [${clock(records[1].data.start)}] Riley Chen: Check C++: launch OR retry --flag?`,
    `🖥️ [${clock(records[2].time)}] Riley Chen shared Editor: migration.ts — https://example.com/migration`,
  ]);
  assert.ok(calls().every((args) => !args.includes("--exclude")));
  fake(`process.stdout.write(${JSON.stringify(fixture)} + '{invalid');`);
  await assert.rejects(tuple.getCapture("call-id"));
});

test("Capture values render as literal Markdown text", () => {
  assert.equal(
    escapeMarkdownText("[Riley](https://example.com) <img> **shared** # notes & more"),
    "&#91;Riley&#93;&#40;https&#58;//example&#46;com&#41; &lt;img&gt; &#42;&#42;shared&#42;&#42; &#35; notes &amp; more",
  );
});

test("compact Capture retains chat, annotations, and known speaker names", async () => {
  const rows = [
    { type: "user_joined", data: { user: { id: 7, full_name: "Riley Chen" } } },
    { type: "user_left", data: { user: { id: 7, full_name: "  " } } },
    { type: "transcription_finished", data: { user_id: 7, text: "Use the canary." } },
    { type: "transcription_finished", data: { user_id: 8, speaker: "Jordan Alvarez", text: "Roll back at 2%." } },
    { type: "agent_prompt", data: { user: { id: 7, full_name: "Riley Chen" }, message: "Check the deploy." } },
    { type: "agent_message", data: { message: "The canary is healthy." } },
    { type: "text_committed", data: { user_id: 8, text: "2% threshold" } },
  ].map((record, index) => ({ id: index + 1, time: "2026-11-09T12:00:00Z", ...record }));
  fake(`process.stdout.write(${JSON.stringify(rows.map(JSON.stringify).join("\n"))});`);
  const text = await tuple.getLocalClockCapture("call-id");
  assert.ok(text.includes("Riley Chen: Use the canary."));
  assert.ok(text.includes("Jordan Alvarez: Roll back at 2%."));
  assert.ok(text.includes("Riley Chen messaged the agent: Check the deploy."));
  assert.ok(text.includes("Agent replied: The canary is healthy."));
  assert.ok(text.includes("user:8 annotated: 2% threshold"));
});

test("export default and explicit transcript selection use destination files", async () => {
  fake(
    `process.stdout.write(JSON.stringify({ file: 'capture.jsonl', format: 'jsonl', calls: 1, records: 3, bytes: 500, replaced: false }));`,
  );
  const receipt = await tuple.exportCapture("/tmp/complete.jsonl", "call-id");
  assert.equal(receipt.records, 3);
  await tuple.exportCapture("/tmp/transcript.jsonl", "call-id", true);
  assert.deepEqual(calls(), [
    ["--format", "json", "capture", "export", "/tmp/complete.jsonl", "--call", "call-id"],
    [
      "--format",
      "json",
      "capture",
      "export",
      "/tmp/transcript.jsonl",
      "--call",
      "call-id",
      "--exclude",
      "events,content",
    ],
  ]);
});

test("Connect includes version-matched guides without launching an agent", async () => {
  fake(`process.stdout.write(args.includes('prompt') ? 'Call bootstrap' : 'Guide: '+args.at(-1));`);
  const prompt = await tuple.getConnectPrompt("call-id");
  for (const section of ["Call bootstrap", "Guide: past-calls", "Guide: call-content", "Guide: safety"]) {
    assert.ok(prompt.includes(section));
  }
  await tuple.getConnectPrompt();
  assert.deepEqual(calls().filter((args) => args.includes("prompt")), [
    ["connect", "prompt", "--format", "json", "--call", "call-id"],
    ["connect", "prompt", "--format", "json"],
  ]);
});

test("bounded recent-call filtering is delegated before the limit", async () => {
  fake("process.stdout.write('[]');");
  await tuple.listRecordedCalls({ participant: "Riley", limit: 10 });
  assert.deepEqual(calls()[0], ["--format", "json", "capture", "list", "--limit", "10", "--participant", "Riley"]);
});

test("room reads request and return occupant details", async () => {
  fake(
    `process.stdout.write(JSON.stringify([{slug:'room',name:'Pairing',http_value:'https://tuple.app/c/room',created_at:'2026-09-10T12:00:00Z',favorited:false,members:args.includes('--members')?[{id:7,full_name:'Riley Chen',email:'riley@example.com'}]:[],kind:'team',active_call:false}]));`,
  );
  const rooms = await tuple.listRooms("--limit", "-1");
  assert.deepEqual(rooms[0].members, [{ id: 7, full_name: "Riley Chen", email: "riley@example.com" }]);
});

test("room tool exposes only the primary personal room", async () => {
  fake(
    `process.stdout.write(JSON.stringify([{slug:'older',name:'',http_value:'https://tuple.app/c/older',created_at:'2026-09-09T12:00:00Z',favorited:false,members:[],kind:'personal',active_call:false},{slug:'newer',name:'',http_value:'https://tuple.app/c/newer',created_at:'2026-09-10T12:00:00Z',favorited:false,members:[],kind:'personal',active_call:false},{slug:'team',name:'Pairing',http_value:'https://tuple.app/c/team',created_at:'2026-09-10T12:00:00Z',favorited:false,members:[],kind:'team',active_call:false}]));`,
  );
  const listRooms = load("src/tools/list-rooms.ts").default;
  const result = await listRooms();
  assert.deepEqual(result.personal.map((room) => room.slug), ["newer"]);
  assert.deepEqual(result.team.map((room) => room.slug), ["team"]);
});

test("primary-room selection is deterministic and the command joins only that slug", async () => {
  const room = (slug, created_at) => ({ slug, kind: "personal", created_at });
  assert.equal(primaryPersonalRoom([room("only", undefined)]).slug, "only");
  assert.equal(
    primaryPersonalRoom([room("older", "2026-09-09T12:00:00Z"), room("newer", "2026-09-10T12:00:00Z")]).slug,
    "newer",
  );
  assert.equal(primaryPersonalRoom([room("dated", "2026-09-10T12:00:00Z"), room("ambiguous", undefined)]), undefined);

  fake(
    `process.stdout.write(args.includes('list') ? JSON.stringify([{slug:'older',kind:'personal',created_at:'2026-09-09T12:00:00Z'},{slug:'newer',kind:'personal',created_at:'2026-09-10T12:00:00Z'}]) : '{}');`,
  );
  const messages = [];
  const failures = [];
  const commandLoad = require("./load-typescript.cjs")(binary, {
    "@raycast/api": {
      getPreferenceValues: () => ({ tuplePath: binary }),
      showHUD: async (message) => messages.push(message),
    },
    "@raycast/utils": { showFailureToast: async (error) => failures.push(error) },
  });
  await commandLoad("src/join-personal-room.ts").default();
  assert.deepEqual(messages, ["Joining your personal room"]);
  assert.deepEqual(failures, []);
  assert.deepEqual(calls().at(-1), ["--format", "json", "rooms", "join", "newer"]);
});

test("idle state is empty, active state uses canonical metadata, races fail", async () => {
  fake(`process.stdout.write('{"in_call":false,"call":null}');`);
  await assert.rejects(tuple.getActiveCall(), (error) => error.kind === TupleErrorKind.NoActiveCall);
  const view = { call_id: "call-id", muted: true, transcribing: false, active_room_slug: null, participants: [] };
  fake(
    `process.stdout.write(JSON.stringify(args.includes('state') ? {in_call:true,call:${JSON.stringify(view)}} : {id:'call-id',state:'active',participants:[],title:null,summary:null,started_at:null,ended_at:null}));`,
  );
  assert.deepEqual(await tuple.getActiveCall(), view);
  assert.deepEqual(calls()[1], ["--format", "json", "call", "show", "call-id"]);
  fake(
    `process.stdout.write(JSON.stringify(args.includes('state') ? {in_call:true,call:${JSON.stringify(view)}} : {id:'other-call',state:'active',participants:[],title:null,summary:null,started_at:null,ended_at:null}));`,
  );
  await assert.rejects(tuple.getActiveCall(), /active call changed/);
});

test("guarded contacts use core joinability without capacity arithmetic", () => {
  assert.equal(contactCallAction({ status: "offline" }), "none");
  assert.equal(contactCallAction({ status: "online" }), "start");
  assert.equal(contactCallAction({ status: "online", idle: true }), "start");
  assert.equal(contactCallAction({ status: "available" }), "start");
  assert.equal(contactCallAction({ status: "away" }), "none");
  assert.equal(
    contactCallAction({ status: "busy", call: { joinable: false, capacity: 10, participant_ids: [] } }),
    "none",
  );
  assert.equal(contactCallAction({ status: "busy", call: { joinable: true } }), "join");
  assert.equal(contactCallAction({ status: "busy" }), "none");
});

test("connected machines are callable only while idle", () => {
  assert.equal(machineCallAction({ id: "machine-id", platform: "linux" }), "start");
  assert.equal(machineCallAction({ id: "machine-id", platform: "mac", call_id: "call-id" }), "none");
});

test("old call JSON and malformed Capture records fail the cutover", async () => {
  fake(`process.stdout.write('{"call_id":"legacy-id","muted":false}');`);
  await assert.rejects(tuple.getCall("legacy-id"), /invalid canonical Call/);
  fake(`process.stdout.write('null\\n');`);
  await assert.rejects(tuple.getCapture("call-id"), /invalid Capture record/);
});

test("read-capture includes the actual guide and every captured category", async () => {
  fake(`process.stdout.write(args.includes('prompt') ? 'Call bootstrap' : args.includes('guide') ? 'Guide: '+args.at(-1) : ${JSON.stringify(fixture)});`);
  const readCapture = load("src/tools/read-capture.ts").default;
  const result = await readCapture({ callId: "call-id" });
  for (const section of ["Call bootstrap", "Guide: past-calls", "Guide: call-content", "Guide: safety"]) {
    assert.ok(result.instructions.includes(section));
  }
  assert.deepEqual(result.records, records);
  assert.ok(calls().some((args) => args.includes("prompt")));
  assert.ok(calls().every((args) => !args.includes("follow") && !args.includes("next")));
});

test("active-call tools preserve session state while menu people are unique", async () => {
  const participants = [
    { id: 7, name: "Riley Chen", email: "riley@example.com", session_id: "mac-a", muted: false, connection_state: "connected" },
    { id: 7, name: "Riley Chen", email: "riley@example.com", session_id: "mac-b", muted: true, connection_state: "connecting" },
    { id: 8, name: "Jordan Alvarez", email: "jordan@example.com", session_id: null, muted: null, connection_state: null },
  ];
  const view = { call_id: "call-id", muted: false, transcribing: false, active_room_slug: "room", participants };
  fake(`process.stdout.write(JSON.stringify(args.includes('state') ? {in_call:true,call:${JSON.stringify(view)}} : {id:'call-id',state:'active',participants:[],title:null,summary:null,started_at:null,ended_at:null}));`);
  const result = await load("src/tools/get-active-call.ts").default();
  assert.deepEqual(result.participants.map((person) => [person.sessionId, person.muted]), [["mac-a", false], ["mac-b", true], [null, null]]);
  assert.deepEqual(callPeople(participants).map((person) => person.name), ["Riley Chen", "Jordan Alvarez"]);
  assert.equal(participants.length, 3);
});

test("End Call preserves the idle HUD without attempting a leave", async () => {
  fake(`process.stdout.write('{"in_call":false,"call":null}');`);
  const messages = [];
  const failures = [];
  const commandLoad = require("./load-typescript.cjs")(binary, {
    "@raycast/api": {
      getPreferenceValues: () => ({ tuplePath: binary }),
      showHUD: async (message) => messages.push(message),
    },
    "@raycast/utils": { showFailureToast: async (error) => failures.push(error) },
  });
  await commandLoad("src/hang-up.ts").default();
  assert.deepEqual(messages, ["No active call"]);
  assert.deepEqual(failures, []);
  assert.deepEqual(calls(), [["--format", "json", "state"]]);
});
