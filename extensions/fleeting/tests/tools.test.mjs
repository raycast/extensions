import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const compiled = mkdtempSync(join(tmpdir(), "fleeting-tool-tests-"));
after(() => rmSync(compiled, { recursive: true, force: true }));
execFileSync(
  process.execPath,
  [
    require.resolve("typescript/bin/tsc"),
    "--ignoreConfig",
    "--module",
    "commonjs",
    "--target",
    "ES2023",
    "--types",
    "node",
    "--strict",
    "--skipLibCheck",
    "--outDir",
    compiled,
    "raycast-env.d.ts",
    "src/tools/list-meetings.ts",
    "src/tools/open-meeting.ts",
    "src/tools/copy-meeting-link.ts",
    "src/tools/set-favorite.ts",
    "src/tools/block-calendar.ts",
  ],
  { cwd: fileURLToPath(new URL("../", import.meta.url)) },
);

// Raycast provides its API at runtime. Stub only that boundary, leaving the tool
// entry points, storage helpers, URL builders, and invite writer under test.
const apiDirectory = join(compiled, "node_modules/@raycast/api");
mkdirSync(apiDirectory, { recursive: true });
writeFileSync(join(apiDirectory, "index.js"), "module.exports = {};");
const api = require(join(apiDirectory, "index.js"));
const storage = new Map();
const opened = [];
const copied = [];
let openError;
let storageError;
let prefs;
Object.assign(api, {
  getPreferenceValues: () => prefs,
  open: async (url) => {
    if (openError) throw openError;
    opened.push(url);
  },
  Clipboard: { copy: async (value) => copied.push(value) },
  LocalStorage: {
    getItem: async (key) => storage.get(key),
    setItem: async (key, value) => {
      if (storageError) throw storageError;
      storage.set(key, value);
    },
  },
});

const ics = require(join(compiled, "lib/ics.js"));
const writeIcsFile = ics.writeIcsFile;
ics.writeIcsFile = (event) => writeIcsFile(event, join(compiled, "invites"));
const listMeetings = require(join(compiled, "tools/list-meetings.js")).default;
const openMeeting = require(join(compiled, "tools/open-meeting.js")).default;
const copyMeetingLink = require(join(compiled, "tools/copy-meeting-link.js")).default;
const setFavorite = require(join(compiled, "tools/set-favorite.js")).default;
const blockCalendar = require(join(compiled, "tools/block-calendar.js")).default;
const { getFavorites } = require(join(compiled, "lib/favorite-storage.js"));
const { MEETINGS } = require(join(compiled, "data/meetings.js"));

beforeEach(() => {
  storage.clear();
  opened.length = 0;
  copied.length = 0;
  openError = undefined;
  storageError = undefined;
  prefs = {
    preferredMeeting: "api",
    quickLaunchMode: "preferred",
    preferredCalendar: "google",
    defaultDuration: "45",
    defaultPrivate: true,
    includeJoinLink: true,
  };
});

test("meeting discovery searches keywords and shares the commands' stored favorites", async () => {
  storage.set("favorites", JSON.stringify(["standup", "api", "deleted", "api"]));
  assert.deepEqual(await getFavorites(), ["standup", "api"]);
  const all = await listMeetings({});
  assert.equal(all.meetings.length, 14);
  assert.equal(all.preferences.preferredMeeting, "api");
  assert.ok(all.timeZone);
  assert.ok(Number.isFinite(Date.parse(all.currentTime)));
  const result = await listMeetings({ query: "  ENDPOINT architecture  ", favoritesOnly: true });
  assert.deepEqual(
    result.meetings.map((meeting) => meeting.id),
    ["api"],
  );
  assert.equal(result.meetings[0].isFavorite, true);
  assert.equal((await listMeetings({ query: "no-such-scenario" })).meetings.length, 0);
  assert.deepEqual(structuredClone(result), result);
});

test("favorite writes are idempotent, preserve other favorites, and propagate storage failure", async () => {
  storage.set("favorites", JSON.stringify(["sales"]));
  await setFavorite({ meetingId: "api", favorite: true });
  const added = await setFavorite({ meetingId: "api", favorite: true });
  assert.deepEqual(added.favorites, ["sales", "api"]);
  await setFavorite({ meetingId: "api", favorite: false });
  const removed = await setFavorite({ meetingId: "api", favorite: false });
  assert.deepEqual(removed.favorites, ["sales"]);
  assert.equal(removed.isFavorite, false);
  assert.deepEqual(structuredClone(added), added);
  storageError = new Error("Storage unavailable");
  await assert.rejects(setFavorite({ meetingId: "api", favorite: true }), /Storage unavailable/);
  assert.deepEqual(await getFavorites(), ["sales"]);
});

test("opening supports explicit, preferred, quick, and random selections", async () => {
  assert.equal((await openMeeting({ meeting: "sales" })).meetingId, "sales");
  assert.equal((await openMeeting({ meeting: "preferred" })).meetingId, "api");
  assert.equal((await openMeeting({})).meetingId, "api");
  prefs.quickLaunchMode = "random";
  const random = await openMeeting({ meeting: "quick" });
  assert.ok(MEETINGS.some((meeting) => meeting.id === random.meetingId));
  assert.equal((await openMeeting({ meeting: "preferred" })).meetingId, "api");
  prefs.preferredMeeting = "deleted";
  assert.equal((await openMeeting({ meeting: "preferred" })).meetingId, "standup");
  assert.deepEqual(structuredClone(random), random);
  openError = new Error("Browser unavailable");
  await assert.rejects(openMeeting({ meeting: "api" }), /Browser unavailable/);
});

test("copying returns the exact clipboard URL", async () => {
  const result = await copyMeetingLink({ meetingId: "api" });
  assert.deepEqual(copied, [result.url]);
  assert.equal(new URL(result.url).searchParams.get("m"), "api");
  assert.equal(opened.length, 0);
});

test("invalid IDs are rejected by every action before side effects", async () => {
  for (const action of [
    () => openMeeting({ meeting: "unknown" }),
    () => copyMeetingLink({ meetingId: "unknown" }),
    () => setFavorite({ meetingId: "unknown", favorite: true }),
    () => blockCalendar({ start: "2030-01-15T10:00:00Z", meetingId: "unknown" }),
  ]) {
    await assert.rejects(action(), /Unknown meeting ID/);
  }
  assert.equal(opened.length, 0);
  assert.equal(copied.length, 0);
  assert.equal(storage.size, 0);
});

test("calendar drafts honor preferences, explicit offsets, and user overrides", async () => {
  const result = await blockCalendar({ start: "2030-01-15T10:00:00+05:30" });
  assert.equal(result.status, "draft-opened");
  assert.equal(result.requiresSaveOrImport, true);
  assert.equal(result.meetingId, "api");
  assert.equal(result.start, "2030-01-15T04:30:00.000Z");
  assert.equal(result.end, "2030-01-15T05:15:00.000Z");
  assert.equal(result.isPrivateRequested, true);
  assert.ok(result.warnings.some((warning) => warning.includes("cannot set Private")));
  assert.deepEqual(opened, [result.url]);
  const override = await blockCalendar({
    start: "2030-01-15T10:00:00Z",
    meetingId: "sales",
    title: "Focus time",
    durationMinutes: 60,
    provider: "outlook",
    includeJoinLink: false,
    isPrivate: false,
  });
  const params = new URL(override.url).searchParams;
  assert.equal(params.get("subject"), "Focus time");
  assert.equal(params.get("enddt"), "2030-01-15T11:00:00.000Z");
  assert.equal(params.has("location"), false);
  assert.doesNotMatch(params.get("body"), /Join:/);
  assert.equal(override.isPrivateRequested, false);
  assert.deepEqual(structuredClone(result), result);
});

test("recurring Outlook exports save private busy invites and require import", async () => {
  const result = await blockCalendar({
    start: "2030-01-15T10:00:00Z",
    provider: "outlook",
    recurrence: "weekly",
  });
  assert.equal(result.status, "invite-saved");
  assert.equal(result.provider, "ics");
  assert.equal(result.requestedProvider, "outlook");
  assert.equal(result.requiresSaveOrImport, true);
  assert.ok(result.warnings.some((warning) => warning.includes("Outlook")));
  const content = readFileSync(result.path, "utf8");
  assert.match(content, /RRULE:FREQ=WEEKLY\r\n/);
  assert.match(content, /CLASS:PRIVATE\r\nTRANSP:OPAQUE\r\n/);
  assert.deepEqual(opened, [result.path]);
});

test("a saved invite is reported even if opening it fails, while draft failures reject", async () => {
  openError = new Error("No calendar app");
  const result = await blockCalendar({ start: "2030-01-15T10:00:00Z", provider: "ics" });
  assert.equal(result.status, "invite-saved");
  assert.equal(result.opened, false);
  assert.match(readFileSync(result.path, "utf8"), /BEGIN:VCALENDAR/);
  assert.ok(result.warnings.some((warning) => warning.includes("could not be opened")));
  assert.deepEqual(structuredClone(result), result);
  await assert.rejects(blockCalendar({ start: "2030-01-15T10:00:00Z", provider: "google" }), /No calendar app/);
});

test("malformed calendar inputs are rejected before opening or saving anything", async () => {
  for (const input of [
    { start: "2030-01-15T10:00:00" },
    { start: "2030-02-30T10:00:00Z" },
    { start: "2030-01-15T24:00:00Z" },
    { start: "invalid" },
    { start: "2030-01-15T10:00:00Z", durationMinutes: 0 },
    { start: "2030-01-15T10:00:00Z", durationMinutes: 1.5 },
    { start: "2030-01-15T10:00:00Z", durationMinutes: Number.MAX_SAFE_INTEGER },
    { start: "2030-01-15T10:00:00Z", title: " " },
    { start: "2030-01-15T10:00:00Z", provider: "unknown" },
    { start: "2030-01-15T10:00:00Z", recurrence: "unknown" },
  ]) {
    await assert.rejects(blockCalendar(input));
  }
  assert.equal(opened.length, 0);
});
