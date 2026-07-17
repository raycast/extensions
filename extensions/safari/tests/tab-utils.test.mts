import assert from "node:assert/strict";
import test from "node:test";
import { getLocalTabApplicationName, isStartPageTab } from "../src/tab-utils.ts";

test("hides Safari Start Page tabs regardless of URL", () => {
  assert.equal(isStartPageTab({ title: "Start Page" }), true);
});

test("keeps regular tabs", () => {
  assert.equal(isStartPageTab({ title: "Raycast Extensions" }), false);
});

test("targets a local tab by its Safari application name", () => {
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

  assert.equal(getLocalTabApplicationName(tab, "Safari"), "Safari Nightly");
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

  assert.equal(getLocalTabApplicationName(tab, "Safari Technology Preview"), "Safari Technology Preview");
});
