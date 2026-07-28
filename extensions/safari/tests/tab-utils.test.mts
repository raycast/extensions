import assert from "node:assert/strict";
import test from "node:test";
import { getLocalTabApplicationTarget, isStartPageTab, shouldHideTab } from "../src/tab-utils.ts";

test("hides Safari Start Page tabs regardless of URL", () => {
  assert.equal(isStartPageTab({ title: "Start Page" }), true);
});

test("keeps regular tabs", () => {
  assert.equal(isStartPageTab({ title: "Raycast Extensions" }), false);
});

test("hides URL-less Safari placeholder tabs", () => {
  assert.equal(shouldHideTab({ title: "Untitled", url: "" }), true);
});

test("keeps tabs with navigable URLs", () => {
  assert.equal(shouldHideTab({ title: "Raycast Extensions", url: "https://www.raycast.com/extensions" }), false);
});

test("targets a local tab by its exact Safari application path", () => {
  const tab = {
    uuid: "local-tab",
    title: "Raycast Extensions",
    url: "https://www.raycast.com/extensions",
    is_local: true,
    window_id: 1,
    index: 1,
    app_name: "Safari Nightly",
    app_path: "/Applications/Safari Nightly.app",
  };

  assert.equal(getLocalTabApplicationTarget(tab, "Safari"), "/Applications/Safari Nightly.app");
});

test("falls back to a Safari application name when no path is available", () => {
  const tab = {
    uuid: "named-tab",
    title: "Raycast Extensions",
    url: "https://www.raycast.com/extensions",
    is_local: true,
    window_id: 1,
    index: 1,
    app_name: "Safari Technology Preview",
  };

  assert.equal(getLocalTabApplicationTarget(tab, "Safari"), "Safari Technology Preview");
});

test("falls back to the configured Safari application for legacy tabs", () => {
  const tab = {
    uuid: "legacy-tab",
    title: "Raycast Extensions",
    url: "https://www.raycast.com/extensions",
    is_local: true,
    window_id: 1,
    index: 1,
  };

  assert.equal(getLocalTabApplicationTarget(tab, "Safari Technology Preview"), "Safari Technology Preview");
});
