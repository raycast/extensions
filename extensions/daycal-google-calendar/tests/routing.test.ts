import assert from "node:assert/strict";
import { detectCalendarRole } from "../src/lib/routing.ts";

assert.equal(detectCalendarRole("Dentist"), "personal");
assert.equal(detectCalendarRole("Client site visit"), "work");
assert.equal(detectCalendarRole("Date night"), "shared");
assert.equal(detectCalendarRole("Dinner with Nan"), "family");
assert.equal(detectCalendarRole("Lunch with Alex"), null);

const custom = {
  work: ["acme"],
  shared: ["partner"],
  personal: ["study"],
};
assert.equal(detectCalendarRole("Meeting with Acme", custom), "work");
assert.equal(detectCalendarRole("Dinner with Partner", custom), "shared");
assert.equal(detectCalendarRole("Study revision", custom), "personal");

console.log("✅ routing tests passed");
