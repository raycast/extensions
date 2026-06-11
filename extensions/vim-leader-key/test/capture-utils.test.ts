import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCapturedAction,
  flattenGroupDestinations,
  getSuggestedKey,
  inferActionFromText,
} from "../src/capture-utils.ts";
import type { RootConfig } from "../src/types.ts";

const config: RootConfig = {
  type: "group",
  actions: [
    {
      id: "apps",
      key: "a",
      type: "group",
      label: "Applications",
      actions: [
        {
          id: "tools",
          key: "t",
          type: "group",
          label: "Tools",
          actions: [],
        },
      ],
    },
    {
      id: "urls",
      key: "u",
      type: "group",
      label: "URLs",
      actions: [],
    },
  ],
};

test("flattenGroupDestinations returns root and nested groups with breadcrumb labels", () => {
  assert.deepEqual(flattenGroupDestinations(config), [
    { label: "Root", path: [] },
    { label: "Applications", path: ["apps"] },
    { label: "Applications / Tools", path: ["apps", "tools"] },
    { label: "URLs", path: ["urls"] },
  ]);
});

test("getSuggestedKey returns the first unused mnemonic character", () => {
  const group = config.actions[0];
  assert.equal(group.type, "group");

  assert.equal(getSuggestedKey("Terminal", group), "e");
  assert.equal(getSuggestedKey("123", group), "1");
});

test("inferActionFromText detects URLs and filesystem paths only", () => {
  assert.deepEqual(inferActionFromText("https://example.com/docs"), {
    type: "url",
    value: "https://example.com/docs",
    label: "example.com",
  });
  assert.deepEqual(inferActionFromText("~/Downloads"), {
    type: "folder",
    value: "~/Downloads",
    label: "Downloads",
  });
  assert.equal(inferActionFromText("just selected prose"), null);
});

test("buildCapturedAction omits empty browser values for URL actions", () => {
  assert.deepEqual(
    buildCapturedAction({
      id: "capture",
      key: "y",
      type: "url",
      label: "YouTube",
      value: "https://youtube.com",
      browser: "",
    }),
    {
      id: "capture",
      key: "y",
      type: "url",
      label: "YouTube",
      value: "https://youtube.com",
    },
  );
});

test("buildCapturedAction stores selected browser only for URL actions", () => {
  assert.deepEqual(
    buildCapturedAction({
      id: "capture",
      key: "y",
      type: "url",
      label: "YouTube",
      value: "https://youtube.com",
      browser: "/Applications/Safari.app",
    }),
    {
      id: "capture",
      key: "y",
      type: "url",
      label: "YouTube",
      value: "https://youtube.com",
      browser: "/Applications/Safari.app",
    },
  );

  assert.deepEqual(
    buildCapturedAction({
      id: "capture",
      key: "s",
      type: "application",
      label: "Safari",
      value: "/Applications/Safari.app",
      browser: "/Applications/Firefox.app",
    }),
    {
      id: "capture",
      key: "s",
      type: "application",
      label: "Safari",
      value: "/Applications/Safari.app",
    },
  );
});
