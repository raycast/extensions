import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

// Compile the actual calendar modules with the project's TypeScript dependency.
const require = createRequire(import.meta.url);
const compiled = mkdtempSync(join(tmpdir(), "fleeting-tests-"));
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
    "--skipLibCheck",
    "--outDir",
    compiled,
    "src/lib/ics.ts",
  ],
  { cwd: fileURLToPath(new URL("../", import.meta.url)) },
);

const { buildIcs, escapeText, writeIcsFile } = require(join(compiled, "lib/ics.js"));
const { formatUtc, googleCalendarUrl, outlookCalendarUrl, validateEvent } = require(join(compiled, "lib/calendar.js"));
const { meetingUrl, resolveMeetingId } = require(join(compiled, "lib/urls.js"));
const { MEETINGS } = require(join(compiled, "data/meetings.js"));

function event(overrides = {}) {
  return {
    meetingId: "standup",
    title: "Engineering Standup",
    start: new Date(2026, 9, 12, 10, 0),
    end: new Date(2026, 9, 12, 10, 30),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    includeJoinLink: true,
    isPrivate: true,
    recurrence: "none",
    ...overrides,
  };
}

test("repeated and concurrent exports preserve each invite", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fleeting-invites-"));
  try {
    const original = event();
    const firstPath = await writeIcsFile(original, directory);
    const firstContent = await readFile(firstPath, "utf8");
    const variants = [event({ end: new Date(2026, 9, 12, 11, 0) }), event({ recurrence: "weekly" }), original];
    const paths = await Promise.all(variants.map((value) => writeIcsFile(value, directory)));
    assert.equal(new Set([firstPath, ...paths]).size, 4);
    assert.equal((await readdir(directory)).length, 4);
    assert.equal(await readFile(firstPath, "utf8"), firstContent);
    const contents = await Promise.all(paths.map((path) => readFile(path, "utf8")));
    assert.match(contents[1], /RRULE:FREQ=WEEKLY\r\n/);
    assert.doesNotMatch(firstContent, /RRULE:/);
    assert.notEqual(contents[0].match(/DTEND:.+/)[0], firstContent.match(/DTEND:.+/)[0]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("calendar text escapes all newline styles and punctuation", () => {
  assert.equal(escapeText("a\r\nb\rc\nd;,e\\f"), "a\\nb\\nc\\nd\\;\\,e\\\\f");
  const content = buildIcs(event({ title: "Sync\rCLASS:PUBLIC\nEND:VEVENT" }));
  const unfolded = content.replace(/\r\n /g, "");
  assert.match(unfolded, /SUMMARY:Sync\\nCLASS:PUBLIC\\nEND:VEVENT\r\n/);
  assert.equal(unfolded.split("\r\n").filter((line) => line.startsWith("CLASS:")).length, 1);
  assert.match(unfolded, /CLASS:PRIVATE\r\n/);
});

test("Unicode calendar lines fold at 75 bytes without changing their text", () => {
  const title = "Weekly 🗓️ 会議; ".repeat(20);
  const content = buildIcs(event({ title }));
  for (const line of content.split("\r\n")) {
    assert.ok(Buffer.byteLength(line, "utf8") <= 75);
  }
  assert.ok(content.replace(/\r\n /g, "").includes(`SUMMARY:${escapeText(title)}\r\n`));
});

test("calendar exports honor join link, privacy, and recurrence choices", () => {
  const plain = event({ includeJoinLink: false, isPrivate: false });
  const ics = buildIcs(plain).replace(/\r\n /g, "");
  assert.doesNotMatch(ics, /(?:LOCATION|URL|RRULE):|Join:/);
  assert.match(ics, /CLASS:PUBLIC\r\nTRANSP:OPAQUE\r\n/);
  assert.match(ics, /DTSTART:\d{8}T\d{6}Z\r\n/);
  for (const recurrence of ["daily", "weekdays", "weekly", "monthly"]) {
    const value = event({ recurrence });
    const repeated = buildIcs(value);
    assert.match(repeated, /DTSTART:20261012T100000\r\n/);
    assert.match(repeated, /RRULE:FREQ=/);
    assert.ok(new URL(googleCalendarUrl(value)).searchParams.get("recur").startsWith("RRULE:"));
  }
  for (const buildUrl of [googleCalendarUrl, outlookCalendarUrl]) {
    const params = new URL(buildUrl(plain)).searchParams;
    assert.equal(params.has("location"), false);
    assert.doesNotMatch(params.get("details") ?? params.get("body"), /Join:/);
  }
  const google = new URL(googleCalendarUrl(event())).searchParams;
  assert.equal(google.get("dates"), `${formatUtc(event().start)}/${formatUtc(event().end)}`);
  assert.equal(google.get("ctz"), event().timeZone);
  assert.equal(google.get("trp"), "true");
  const outlook = new URL(outlookCalendarUrl(event())).searchParams;
  assert.equal(outlook.get("startdt"), event().start.toISOString());
  assert.equal(outlook.get("enddt"), event().end.toISOString());
});

test("all meeting links use supported parameters and invalid preferences fall back", () => {
  for (const meeting of MEETINGS) {
    const url = new URL(meetingUrl(meeting.id));
    assert.equal(url.origin, "https://iminafleeting.com");
    assert.deepEqual(
      [...url.searchParams],
      [
        ["m", meeting.id],
        ["v", "en-US"],
      ],
    );
  }
  assert.equal(resolveMeetingId("unknown"), "standup");
  assert.equal(resolveMeetingId(undefined), "standup");
  assert.throws(() => meetingUrl("unknown"), /Unknown meeting ID/);
});

test("invalid titles and dates are rejected before export", () => {
  assert.equal(validateEvent(event()), undefined);
  assert.equal(validateEvent(event({ title: " " })), "Event title is required");
  assert.equal(validateEvent(event({ start: new Date("invalid") })), "Choose a valid start date and time");
  assert.equal(validateEvent(event({ end: event().start })), "End time must be after start time");
});

test("recurring exports keep their duration when a meeting crosses a DST transition", () => {
  for (const [start, end, dates] of [
    ["2026-11-01T05:30:00Z", "2026-11-01T06:30:00Z", "20261101T053000Z/20261101T063000Z"],
    ["2026-03-08T06:30:00Z", "2026-03-08T07:30:00Z", "20260308T063000Z/20260308T073000Z"],
  ]) {
    const value = event({ start, end, timeZone: "America/New_York", recurrence: "weekly" });
    const output = execFileSync(
      process.execPath,
      [
        "-e",
        `
      const { buildIcs } = require(process.argv[1]);
        const { googleCalendarUrl } = require(process.argv[3]);
      const value = JSON.parse(process.argv[2]);
      value.start = new Date(value.start);
      value.end = new Date(value.end);
        process.stdout.write(JSON.stringify({ ics: buildIcs(value), google: googleCalendarUrl(value) }));
    `,
        join(compiled, "lib/ics.js"),
        JSON.stringify(value),
        join(compiled, "lib/calendar.js"),
      ],
      {
        env: { ...process.env, TZ: "America/New_York" },
        encoding: "utf8",
      },
    );
    const { ics, google } = JSON.parse(output);
    assert.match(ics, /DTSTART:\d{8}T013000\r\n/);
    assert.match(ics, /DURATION:PT3600S\r\n/);
    assert.doesNotMatch(ics, /DTEND:/);
    const params = new URL(google).searchParams;
    assert.equal(params.get("dates"), dates);
    assert.equal(params.get("ctz"), "America/New_York");
  }
});
