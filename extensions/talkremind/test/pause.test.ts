import assert from "node:assert/strict";
import { test } from "node:test";
import { findApp } from "../src/lib/apps.ts";
import { describeEnd, parseCustomPause } from "../src/lib/pause.ts";

const at = (h: number, m = 0) => new Date(2026, 9, 24, h, m); // 24 Oct 2026, local time

test("a clock time later today ends today", () => {
  const option = parseCustomPause("15:30", at(10));
  assert.equal(option?.request.until, at(15, 30).toISOString());
  assert.equal(option?.title, "Until 15:30");
});

test("a clock time that has passed means tomorrow", () => {
  const option = parseCustomPause("9.05", at(10));
  assert.equal(option?.request.until, new Date(2026, 9, 25, 9, 5).toISOString());
  assert.match(option?.title ?? "", /tomorrow/i);
});

test("lengths: plain number, minutes, hours, both", () => {
  const minutes = (text: string) => parseCustomPause(text, at(10))?.request.minutes;
  assert.equal(minutes("45"), 45);
  assert.equal(minutes("45m"), 45);
  assert.equal(minutes("45 min"), 45);
  assert.equal(minutes("2h"), 120);
  assert.equal(minutes("1h30"), 90);
  assert.equal(minutes("1h 30m"), 90);
  assert.equal(minutes("1 std"), 60);
});

test("what is not a pause is left alone", () => {
  for (const text of ["", "  ", "abc", "25:00", "12:75", "0", "0m", "10081", "200h", "1.5h", "15:3"]) {
    assert.equal(parseCustomPause(text, at(10)), undefined, `"${text}"`);
  }
});

test("the title says the length in words", () => {
  assert.equal(parseCustomPause("1", at(10))?.title, "1 minute");
  assert.equal(parseCustomPause("90", at(10))?.title, "1 hour 30 minutes");
  assert.equal(parseCustomPause("2h", at(10))?.title, "2 hours");
});

test("describeEnd: today shows the time, another day the weekday", () => {
  assert.equal(describeEnd(at(15, 30).toISOString(), at(10)), "15:30");
  assert.match(describeEnd(new Date(2026, 9, 25, 7).toISOString(), at(10)), /07:00/);
});

test("findApp: exact name, bundle id, then a unique prefix; ambiguity is an error", () => {
  const apps = [
    { name: "Mail", bundleId: "com.apple.mail" },
    { name: "Mailplane", bundleId: "com.mailplane" },
    { name: "Xcode", bundleId: "com.apple.dt.Xcode" },
  ];
  assert.equal(findApp(apps, "mail").bundleId, "com.apple.mail");
  assert.equal(findApp(apps, "com.apple.dt.Xcode").name, "Xcode");
  assert.equal(findApp(apps, "xco").name, "Xcode");
  assert.throws(() => findApp(apps, "ma"), /Mail, Mailplane/);
  assert.throws(() => findApp(apps, "nothing"), /No app/);
});
