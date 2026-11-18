import assert from "node:assert/strict";
import test from "node:test";
import { readSavedTimeZones, timeZoneOptions, timeZoneTitle } from "../src/lib/time-zones";

test("saved timezone selections keep deliberate empty choices and reject corrupt values", () => {
  assert.deepEqual(readSavedTimeZones("[]"), []);
  assert.deepEqual(readSavedTimeZones('["UTC","Asia/Shanghai","UTC"]'), ["UTC", "Asia/Shanghai"]);
  assert.equal(readSavedTimeZones('["Mars/Olympus"]'), undefined);
  assert.equal(readSavedTimeZones("not json"), undefined);
});

test("timezone choices contain defaults, supported zones, and selected IANA aliases without duplicates", () => {
  const options = timeZoneOptions(["Asia/Kolkata", "UTC"]);
  assert.ok(options.includes("Asia/Shanghai"));
  assert.ok(options.includes("UTC"));
  assert.ok(options.includes("America/Los_Angeles"));
  assert.ok(options.includes("Asia/Kolkata"));
  assert.ok(options.includes("Europe/London"));
  assert.equal(options.length, new Set(options).size);
  assert.ok(timeZoneTitle("Asia/Shanghai").includes("Shanghai"));
});
