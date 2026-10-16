import assert from "node:assert/strict";
import test from "node:test";
import { durationChangeSeconds, shiftTimeDraft, validateTimeDraft, type TimeDraft } from "../src/lib/time-editing";
import { timeEditingMarkdown as rawTimeEditingMarkdown } from "../src/lib/time-editing-preview";
import { parseLocalDateTime } from "../src/lib/date-time-input";
import { formatLogDate } from "../src/lib/date";

const timeEditingMarkdown: typeof rawTimeEditingMarkdown = (...args) =>
  rawTimeEditingMarkdown(...args).replaceAll("\u00a0", " ");

const now = new Date(2026, 9, 15, 11, 5);
const original: TimeDraft = {
  startedAt: new Date(2026, 9, 15, 9, 45, 47, 123).toISOString(),
  endedAt: now.toISOString(),
};

test("relative adjustments change only the selected endpoint by the exact number of minutes", () => {
  const earlier = shiftTimeDraft(original, "start", -15);
  assert.equal(Date.parse(original.startedAt) - Date.parse(earlier.startedAt), 15 * 60000);
  assert.equal(earlier.endedAt, original.endedAt);
  assert.equal(durationChangeSeconds(original, earlier, now), 15 * 60);
  const laterEnd = shiftTimeDraft(earlier, "end", 5);
  assert.equal(laterEnd.startedAt, earlier.startedAt);
  assert.equal(Date.parse(laterEnd.endedAt!) - Date.parse(original.endedAt!), 5 * 60000);
  assert.equal(durationChangeSeconds(original, laterEnd, now), 20 * 60);
  assert.equal(original.startedAt, new Date(2026, 9, 15, 9, 45, 47, 123).toISOString());
});

test("an exact input can be applied to a draft, adjusted again, and reversed without altering its baseline", () => {
  const shifted = shiftTimeDraft(original, "start", -15);
  const exact = parseLocalDateTime(new Date(2026, 9, 15), "09:23", new Date(shifted.startedAt)).value!;
  const applied = { ...shifted, startedAt: exact.toISOString() };
  const adjusted = shiftTimeDraft(applied, "start", 5);
  assert.equal(new Date(adjusted.startedAt).getHours(), 9);
  assert.equal(new Date(adjusted.startedAt).getMinutes(), 28);
  assert.deepEqual(shiftTimeDraft(adjusted, "start", -5), applied);
  assert.notEqual(applied.startedAt, original.startedAt);
  assert.equal(applied.endedAt, original.endedAt);
});

test("adjustments across midnight keep the correct dates and duration", () => {
  const times = {
    startedAt: new Date(2026, 9, 15, 0, 5).toISOString(),
    endedAt: new Date(2026, 9, 15, 0, 35).toISOString(),
  };
  const shifted = shiftTimeDraft(times, "start", -15);
  assert.equal(new Date(shifted.startedAt).getDate(), 14);
  assert.equal(new Date(shifted.startedAt).getHours(), 23);
  assert.equal(durationChangeSeconds(times, shifted, now), 15 * 60);
  assert.equal(validateTimeDraft(shifted, now), undefined);
});

test("invalid times, reversed ranges and future end times cannot be applied or saved", () => {
  assert.match(validateTimeDraft({ ...original, startedAt: "invalid" }, now)!, /valid dates/);
  assert.match(validateTimeDraft({ ...original, endedAt: original.startedAt }, now)!, /after start/);
  assert.match(validateTimeDraft(shiftTimeDraft(original, "end", -120), now)!, /after start/);
  assert.equal(validateTimeDraft(original, now), undefined);
  assert.equal(validateTimeDraft({ ...original, endedAt: new Date(now.getTime() - 1).toISOString() }, now), undefined);
  assert.match(validateTimeDraft({ ...original, endedAt: new Date(now.getTime() + 1).toISOString() }, now)!, /future/);
  assert.match(validateTimeDraft(shiftTimeDraft(original, "end", 4), now)!, /future/);
  assert.match(validateTimeDraft(shiftTimeDraft(original, "end", 5), now)!, /future/);
});

test("running drafts use now as the end, reject future starts and have no editable end", () => {
  const running = { startedAt: original.startedAt };
  const earlier = shiftTimeDraft(running, "start", -15);
  assert.equal(earlier.endedAt, undefined);
  assert.equal(durationChangeSeconds(running, earlier, now), 900);
  assert.equal(validateTimeDraft({ startedAt: now.toISOString() }, now), undefined);
  assert.match(validateTimeDraft({ startedAt: new Date(now.getTime() + 1).toISOString() }, now)!, /future/);
  assert.throws(() => shiftTimeDraft(running, "end", 5), /no end time/);
});

test("each one-minute adjustment is reflected in a numeric-only preview immediately", () => {
  const earlier = shiftTimeDraft(original, "start", -1);
  const preview = timeEditingMarkdown(original, earlier, "start", now);
  assert.match(preview, /## \[ Start · 09:44 \]/);
  assert.doesNotMatch(preview, /Time · Adjusting|^#\s/m);
  assert.doesNotMatch(preview, /🟢|▶|\[ End/);
  assert.match(preview, /##   End   · 11:05  /);
  assert.match(preview, /1h 19m → \*\*1h 20m\*\*/);
  assert.doesNotMatch(preview, /Before|After|of work|Duration unchanged/);
  assert.doesNotMatch(preview, /data:image|<svg|!\[|\| Before|NaN|Infinity/);
});

test("end adjustments move the focus brackets to the end row and preserve start values", () => {
  const later = shiftTimeDraft(original, "end", 1);
  const preview = timeEditingMarkdown(original, later, "end", now);
  assert.match(preview, /## \[ End   · 11:06 \]/);
  assert.doesNotMatch(preview, /Time · Adjusting|^#\s|🟢|▶|\[ Start/m);
  assert.match(preview, /##   Start · 09:45  /);
  assert.doesNotMatch(preview, /Before|After|of work|Duration unchanged/);
});

test("moving focus leaves both labels and times at the same text positions without a large code block", () => {
  const startFocused = timeEditingMarkdown(original, original, "start", now).split("\n");
  const endFocused = timeEditingMarkdown(original, original, "end", now).split("\n");
  assert.equal(startFocused.length, endFocused.length);
  for (const label of ["Start", "End", "09:45", "11:05"]) {
    const startLine = startFocused.findIndex((line) => line.includes(label));
    const endLine = endFocused.findIndex((line) => line.includes(label));
    assert.equal(startLine, endLine, `${label} must not move vertically`);
    assert.equal(
      startFocused[startLine].indexOf(label),
      endFocused[endLine].indexOf(label),
      `${label} must not indent`,
    );
  }
  for (const lines of [startFocused, endFocused]) {
    assert.equal(lines.filter((line) => line.includes("```")).length, 0);
    assert.equal(lines.filter((line) => line.startsWith("## [ ")).length, 1);
  }
});

test("shortening work, zero elapsed time and clock rollback produce finite numeric previews", () => {
  const shortened = shiftTimeDraft(original, "end", -1);
  assert.match(timeEditingMarkdown(original, shortened, "end", now), /1h 19m → \*\*1h 18m\*\*/);
  for (const start of [now.toISOString(), new Date(now.getTime() + 60000).toISOString()]) {
    const running = { startedAt: start };
    assert.doesNotMatch(timeEditingMarkdown(running, running, "start", now), /NaN|Infinity|data:image/);
  }
});

test("exact input shows the current time without a second before/after or duration-delta summary", () => {
  const exact = { ...original, startedAt: new Date(2026, 9, 15, 9, 23).toISOString() };
  const preview = timeEditingMarkdown(original, exact, "start", now);
  assert.match(preview, /## \[ Start · 09:23 \]/);
  assert.doesNotMatch(preview, /Before|After|of work|Duration unchanged/);
});

test("running numbers advance with now without changing the stored draft", () => {
  const running = { startedAt: new Date(2026, 9, 15, 11, 0).toISOString() };
  assert.match(timeEditingMarkdown(running, running, "start", now), /5m → \*\*5m\*\*/);
  const next = new Date(now.getTime() + 60000);
  assert.match(timeEditingMarkdown(running, running, "start", next), /6m → \*\*6m\*\*/);
  assert.equal(running.startedAt, new Date(2026, 9, 15, 11, 0).toISOString());
});

test("cross-day corrections show the current date and preserve the running endpoint", () => {
  const running = { startedAt: new Date(2026, 9, 15, 0, 0).toISOString() };
  const preview = timeEditingMarkdown(running, shiftTimeDraft(running, "start", -1), "start", now);
  assert.match(preview, /Now \(Running\)/);
  assert.ok(preview.includes(formatLogDate(new Date(2026, 9, 14).toISOString())));

  assert.match(preview, /23:59/);
});

test("same-day dates appear once and midnight corrections restore each endpoint's date", () => {
  const preview = timeEditingMarkdown(original, original, "start", now);
  const date = formatLogDate(original.startedAt);
  assert.equal(preview.split(date).length - 1, 1);
  assert.ok(preview.startsWith(`${date}\n\n`));
  const crossing = { ...original, startedAt: new Date(2026, 9, 14, 23, 59).toISOString() };
  const crossDay = timeEditingMarkdown(original, crossing, "end", now);
  assert.ok(crossDay.includes(`Start · 23:59 · ${formatLogDate(crossing.startedAt)}`));
  assert.ok(crossDay.includes(`End   · 11:05 · ${formatLogDate(crossing.endedAt!)}`));
  const restored = timeEditingMarkdown(original, shiftTimeDraft(crossing, "start", 1), "start", now);
  assert.equal(restored.split(date).length - 1, 1);
});
