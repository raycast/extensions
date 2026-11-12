import assert from "node:assert/strict";
import test from "node:test";
import { extractJiraIssue, matchesJiraActivity } from "../src/utils/jira.ts";
import {
  formatTicketDuration,
  nextActivityPage,
  readActivityPages,
  summarizeTicketTime,
  ticketTimeText,
} from "../src/utils/ticket-time.ts";

const issue = extractJiraIssue({
  url: "https://your-team.atlassian.net/browse/PROJ-123",
  title: "[PROJ-123] Improve sign-in - Jira",
});
const native = { remote_service: "jira", remote_id: issue.key, remote_url: issue.url };

test("ticket time matches exact native Jira identity, including board links and URL parameters", () => {
  for (const url of [
    issue.url,
    `${issue.url}?source=board#comment-1`,
    `${issue.url}/`,
    "https://your-team.atlassian.net/jira/software/c/projects/PROJ/boards/1?selectedIssue=PROJ-123",
  ]) {
    assert.equal(matchesJiraActivity(issue, { ...native, remote_url: url }), true);
  }
});

test("same key on another Jira site, prefix collisions and other services never count", () => {
  for (const activity of [
    { ...native, remote_url: "https://other-team.atlassian.net/browse/PROJ-123" },
    { ...native, remote_id: "PROJ-1234", remote_url: "https://your-team.atlassian.net/browse/PROJ-1234" },
    { ...native, remote_service: "github" },
    { ...native, remote_id: "PROJ-9" },
    { ...native, remote_url: "https://your-team.atlassian.net.evil.example/browse/PROJ-123" },
    { ...native, remote_url: "http://your-team.atlassian.net/browse/PROJ-123" },
  ])
    assert.equal(matchesJiraActivity(issue, activity), false);
});

test("earlier fork bookings with the exact URL in their description are counted", () => {
  assert.equal(matchesJiraActivity(issue, { description: `PROJ-123 — Improve sign-in\n${issue.url}` }), true);
  assert.equal(matchesJiraActivity(issue, { description: `Worked on (${issue.url}).` }), true);
  assert.equal(matchesJiraActivity(issue, { description: `#PROJ-123 Improve sign-in` }), false);
  assert.equal(matchesJiraActivity(issue, { description: "https://other-team.atlassian.net/browse/PROJ-123" }), false);
});

test("a description mention cannot override a native link to another ticket", () => {
  assert.equal(
    matchesJiraActivity(issue, {
      ...native,
      remote_url: "https://your-team.atlassian.net/browse/PROJ-9",
      description: issue.url,
    }),
    false,
  );
  assert.equal(
    matchesJiraActivity(issue, { remote_service: "jira", remote_id: issue.key, description: issue.url }),
    false,
  );
});

test("self-hosted ticket identity includes its context path", () => {
  const hosted = extractJiraIssue(
    { url: "https://jira.example.com/company/browse/PROJ-123", title: "" },
    "jira.example.com",
  );
  assert.equal(matchesJiraActivity(hosted, { ...native, remote_url: hosted.url }), true);
  assert.equal(
    matchesJiraActivity(hosted, { ...native, remote_url: "https://jira.example.com/browse/PROJ-123" }),
    false,
  );
});

const activity = (id, date, overrides = {}) => ({
  id,
  date,
  worked_seconds: 3600,
  user: { id: 7 },
  timer_started_at: null,
  ...overrides,
});

test("totals include previous dates but only the current user's time", () => {
  const summary = summarizeTicketTime(
    [
      activity(1, "2025-01-01"),
      activity(2, "2026-11-12", { worked_seconds: 900 }),
      activity(3, "2026-11-12", { worked_seconds: 7200, user: { id: 8 } }),
    ],
    7,
    "2026-11-12",
  );
  assert.deepEqual(summary, { totalSeconds: 4500, todaySeconds: 900, bookings: 2, running: false });
});

test("worked seconds take priority over differently billed seconds and decimal hours", () => {
  const summary = summarizeTicketTime(
    [activity(1, "2026-11-12", { worked_seconds: 1200, seconds: 1800, hours: 0.5 })],
    7,
    "2026-11-12",
  );
  assert.equal(summary.totalSeconds, 1200);
});

test("older responses can fall back to seconds or decimal hours", () => {
  const summary = summarizeTicketTime(
    [
      activity(1, "2026-11-12", { worked_seconds: undefined, seconds: 900 }),
      activity(2, "2026-11-12", { worked_seconds: undefined, hours: 0.1 }),
    ],
    7,
    "2026-11-12",
  );
  assert.equal(summary.totalSeconds, 1260);
});

test("running timers are flagged without adding elapsed time twice", () => {
  const entry = activity(1, "2026-11-12", { worked_seconds: 900, timer_started_at: "2026-11-12T08:00:00Z" });
  const summary = summarizeTicketTime([entry, entry], 7, "2026-11-12");
  assert.deepEqual(summary, { totalSeconds: 900, todaySeconds: 900, bookings: 1, running: true });
});

test("zero bookings is distinct from unavailable or invalid history", () => {
  assert.equal(
    ticketTimeText(summarizeTicketTime([], 7, "2026-11-12")).startsWith("0m total · 0m today · 0 bookings"),
    true,
  );
  for (const time of [-1, NaN, undefined])
    assert.throws(
      () => summarizeTicketTime([activity(1, "2026-11-12", { worked_seconds: time })], 7, "2026-11-12"),
      /Invalid recorded/,
    );
});

test("durations preserve meaningful sub-minute time and long totals", () => {
  for (const [seconds, expected] of [
    [0, "0m"],
    [30, "30s"],
    [90, "1m 30s"],
    [4500, "1h 15m"],
    [360000, "100h"],
  ])
    assert.equal(formatTicketDuration(seconds), expected);
});

test("pagination extracts only a numeric next page, not an external request URL", () => {
  assert.equal(
    nextActivityPage(
      '<https://elsewhere.example/activities?page=2>; rel="next", <https://example.invalid/?page=1>; rel="prev"',
      1,
    ),
    2,
  );
  assert.equal(nextActivityPage(undefined, 1), undefined);
  assert.equal(nextActivityPage('<https://example.invalid/?page=1>; rel="prev"', 2), undefined);
  for (const link of [
    '<https://example.invalid/?page=1>; rel="next"',
    '<https://example.invalid/?page=NaN>; rel="next"',
    '<https://example.invalid/>; rel="next"',
    '<https://example.invalid/?page=2&page=3>; rel="next"',
  ])
    assert.throws(() => nextActivityPage(link, 1), /Invalid activity pagination/);
});

test("loads more than 100 bookings and deduplicates overlapping pages", async () => {
  const pages = [];
  const all = await readActivityPages(async (page) => {
    pages.push(page);
    return page === 1
      ? { activities: Array.from({ length: 100 }, (_, id) => ({ id: id + 1 })), nextPage: 2, total: 101 }
      : { activities: [{ id: 100 }, { id: 101 }], total: 101 };
  });
  assert.deepEqual(pages, [1, 2]);
  assert.equal(all.length, 101);
});

test("a failed later page or truncated history never becomes a partial total", async () => {
  await assert.rejects(
    readActivityPages(async (page) => {
      if (page === 2) throw new Error("network unavailable");
      return { activities: [{ id: 1 }], nextPage: 2, total: 2 };
    }),
    /network unavailable/,
  );
  await assert.rejects(
    readActivityPages(async () => ({ activities: [{ id: 1 }], total: 2 })),
    /Incomplete activity history/,
  );
  await assert.rejects(
    readActivityPages(async () => ({ activities: [], nextPage: 1 })),
    /Invalid activity pagination/,
  );
});
