import assert from "node:assert/strict";
import test from "node:test";

import { findApplication } from "../src/application";

test("returns an exact application name match first", () => {
  const applications = [
    { name: "Cmux", localizedName: "Cmux", bundleId: "com.example.cmux" },
    { name: "cmux", localizedName: "cmux", bundleId: "com.cmuxterm.app" },
  ];

  assert.equal(findApplication(applications, "cmux"), applications[1]);
});

test("falls back to case-insensitive matching", () => {
  const applications = [{ name: "Cmux", localizedName: "Cmux", bundleId: "com.example.cmux" }];

  assert.equal(findApplication(applications, "cmux"), applications[0]);
});

test("matches on localized name when display name differs", () => {
  const applications = [{ name: "Terminal", localizedName: "WezTerm", bundleId: "com.github.wez.wezterm" }];

  assert.equal(findApplication(applications, "WezTerm"), applications[0]);
});

test("matches cmux by bundle identifier", () => {
  const applications = [{ name: "Terminal", localizedName: "Terminal", bundleId: "com.cmuxterm.app" }];

  assert.equal(findApplication(applications, "cmux"), applications[0]);
});
