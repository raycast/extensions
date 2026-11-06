import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import {
  activeDocumentScript,
  createDocumentScript,
  documentTextScript,
  toggleTrackChangesScript,
} from "../src/word-scripts";

if (!process.argv.includes("--exclusive-slot")) {
  throw new Error(
    "This live test requires a fresh exclusive Word test slot. Run with --exclusive-slot only after it is assigned.",
  );
}

function osa(script: string, args: string[] = []) {
  return execFileSync("/usr/bin/osascript", ["-e", script, ...args], { encoding: "utf8", timeout: 40000 }).trim();
}
if (osa('if application id "com.microsoft.Word" is not running then return "closed"') === "closed") {
  throw new Error("Open Word within the assigned test slot first. This harness will not launch it automatically.");
}
const previous = osa(
  'tell application id "com.microsoft.Word"\nif (count of documents) > 0 then return full name of active document\nend tell',
);
const beforeSaved = previous
  ? osa('tell application id "com.microsoft.Word" to return saved of active document')
  : undefined;
const beforeCount = Number(osa('tell application id "com.microsoft.Word" to return count of documents'));
const sample =
  'Raycast disposable Word integration test.\rSecond paragraph with "quotes", Unicode café, and a tab:\tvalue.';
let createdIdentity = "";
let createdName = "";
try {
  const creationScript = process.argv.includes("--background")
    ? createDocumentScript.replace("\n    activate\n", "\n")
    : createDocumentScript;
  [createdName] = JSON.parse(osa(creationScript, [sample]));
  assert.equal(
    osa(`on run argv\ntell application id "com.microsoft.Word" to return saved of document (item 1 of argv)\nend run`, [
      createdName,
    ]),
    "false",
  );
  osa(
    `on run argv\ntell application id "com.microsoft.Word"\nset saved of document (item 1 of argv) to true\nend tell\nend run`,
    [createdName],
  );
  const info = JSON.parse(osa(activeDocumentScript));
  console.log(
    "READ_ACTIVE",
    JSON.stringify({ name: info[0], path: info[2], saved: info[3], tracking: info[4], readOnly: info[5] }),
  );
  assert.equal(info[0], createdName);
  assert.equal(info[3], true);
  assert.equal(osa('tell application id "com.microsoft.Word" to return saved of active document'), "true");
  createdIdentity = info[1];
  assert.equal(typeof info[3], "boolean");
  assert.equal(typeof info[4], "boolean");
  assert.equal(info[2], "");

  const [content] = JSON.parse(osa(documentTextScript, [createdIdentity, "document"]));
  assert.equal(content.replace(/\r$/, ""), sample);
  osa(
    `on run argv\ntell application id "com.microsoft.Word"\nset saved of document (item 1 of argv) to true\nend tell\nend run`,
    [createdName],
  );
  const beforeInspection = JSON.parse(osa(documentTextScript, [createdIdentity, "document"]));
  const cleanState = JSON.parse(osa(activeDocumentScript));
  assert.equal(cleanState[3], true);
  assert.equal(osa('tell application id "com.microsoft.Word" to return saved of active document'), "true");
  assert.deepEqual(JSON.parse(osa(documentTextScript, [createdIdentity, "document"])), beforeInspection);
  console.log("PASS inspector preserves saved=true and exact disposable text");
  const originalTracking = info[4];
  const [toggled] = JSON.parse(osa(toggleTrackChangesScript, [createdIdentity]));
  assert.equal(toggled, !originalTracking);
  const [restored] = JSON.parse(osa(toggleTrackChangesScript, [createdIdentity]));
  assert.equal(restored, originalTracking);
  assert.deepEqual(JSON.parse(osa(toggleTrackChangesScript, [createdIdentity, "on"])), [true]);
  assert.deepEqual(JSON.parse(osa(toggleTrackChangesScript, [createdIdentity, "on"])), [true]);
  assert.deepEqual(JSON.parse(osa(toggleTrackChangesScript, [createdIdentity, "off"])), [false]);
  try {
    osa(documentTextScript, ["not-the-active-document", "document"]);
    throw new Error("Stale identity was accepted");
  } catch (error) {
    assert.match(String(error), /active document changed/);
  }
  osa(
    `on run argv\ntell application id "com.microsoft.Word"\nif full name of active document is not item 1 of argv then error "The active document changed before selection. Leave it untouched."\nset selection start of selection to 0\nset selection end of selection to 7\nend tell\nend run`,
    [createdIdentity],
  );
  const [selected] = JSON.parse(osa(documentTextScript, [createdIdentity, "selection"]));
  assert.equal(selected, "Raycast");
  console.log(
    "PASS create / Unicode-and-tabs JSON / text / selection / metadata / tracking on-and-off / stale-document guard",
  );
} finally {
  if (createdName)
    osa(
      `on run argv\ntell application id "com.microsoft.Word"\nset d to document (item 1 of argv)\nif content of text object of d is not ((item 2 of argv) & return) then error "Fixture content changed; leave it open."\nif (item 3 of argv) is not "" and full name of d is not item 3 of argv then error "Fixture identity changed; leave it open."\nclose d saving no\nend tell\nend run`,
      [createdName, sample, createdIdentity],
    );
  assert.equal(Number(osa('tell application id "com.microsoft.Word" to return count of documents')), beforeCount);
  if (previous) {
    const active = osa('tell application id "com.microsoft.Word" to return full name of active document');
    assert.equal(active, previous);
    assert.equal(osa('tell application id "com.microsoft.Word" to return saved of active document'), beforeSaved);
  }
  console.log("PASS disposable document closed; prior count, active identity, and pre-run saved flag preserved");
}
