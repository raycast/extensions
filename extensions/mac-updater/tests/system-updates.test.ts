import { test } from "node:test";
import * as assert from "node:assert/strict";
import { parseSoftwareUpdateList } from "../src/utils/sources/system-updates-parse";

test("parseSoftwareUpdateList extracts label, title, version, size, flags", () => {
  const out = [
    "Software Update Tool",
    "",
    "Finding available software",
    "Software Update found the following new or updated software:",
    "* Label: macOS Sequoia 15.6.1-24G90",
    "\tTitle: macOS Sequoia 15.6.1, Version: 15.6.1, Size: 7340032KiB, Recommended: YES, Action: restart,",
    "* Label: Safari18.6-18.6",
    "\tTitle: Safari, Version: 18.6, Size: 131072K, Recommended: YES,",
  ].join("\n");
  const list = parseSoftwareUpdateList(out);
  assert.equal(list.length, 2);

  assert.equal(list[0].label, "macOS Sequoia 15.6.1-24G90");
  assert.equal(list[0].title, "macOS Sequoia 15.6.1");
  assert.equal(list[0].version, "15.6.1");
  assert.equal(list[0].sizeMB, 7168); // 7340032 KiB / 1024
  assert.equal(list[0].recommended, true);
  assert.equal(list[0].restart, true);

  assert.equal(list[1].title, "Safari");
  assert.equal(list[1].restart, false);
  assert.equal(list[1].sizeMB, 128);
});

test("parseSoftwareUpdateList returns [] when nothing is pending", () => {
  const out = [
    "Software Update Tool",
    "",
    "Finding available software",
    "No new software available.",
  ].join("\n");
  assert.deepEqual(parseSoftwareUpdateList(out), []);
});
