import assert from "node:assert/strict";
import test from "node:test";

import { parseApplicationOptions, updateApplicationOptions } from "../src/lib/app-options";

const EXISTING_CONFIG = `patch:
  app_options:
    com.apple.dt.Xcode:
      ascii_mode: true # 初始爲西文模式
      ascii_punct: true
    com.raycast.macos:
      ascii_mode: true
      inline: true

  style:
    color_scheme: macos_light
`;

test("updates one nested application without changing unrelated configuration", () => {
  const next = updateApplicationOptions(EXISTING_CONFIG, "com.apple.dt.Xcode", {
    ascii_mode: false,
    ascii_punct: undefined,
  });

  assert.match(next, /com\.apple\.dt\.Xcode:\n\s+ascii_mode: false # 初始爲西文模式/);
  assert.doesNotMatch(next, /com\.apple\.dt\.Xcode:[\s\S]*?ascii_punct: true/);
  assert.match(next, /com\.raycast\.macos:\n\s+ascii_mode: true\n\s+inline: true/);
  assert.match(next, /style:\n\s+color_scheme: macos_light/);
});

test("adds a direct patch entry for a newly selected application", () => {
  const next = updateApplicationOptions(EXISTING_CONFIG, "com.example.Editor", {
    ascii_mode: true,
    inline: true,
  });
  assert.match(next, /"app_options\/com\.example\.Editor":\n\s+ascii_mode: true\n\s+inline: true/);

  const options = parseApplicationOptions(next);
  assert.deepEqual(options.find((item) => item.bundleId === "com.example.Editor"), {
    bundleId: "com.example.Editor",
    asciiMode: true,
    asciiPunct: undefined,
    inline: true,
    vimMode: undefined,
  });
});

test("removes an empty application override when returning to inherited settings", () => {
  const source = `patch:\n  "app_options/com.example.Editor":\n    ascii_mode: true\n`;
  const next = updateApplicationOptions(source, "com.example.Editor", { ascii_mode: undefined });
  assert.equal(next, "patch:\n");
});

test("expands and updates a common inline application mapping", () => {
  const source = `patch:\n  app_options:\n    com.apple.Terminal: { ascii_mode: true, no_inline: true } # terminal\n`;
  const next = updateApplicationOptions(source, "com.apple.Terminal", {
    ascii_mode: false,
    inline: true,
  });
  assert.match(next, /com\.apple\.Terminal: # terminal/);
  assert.match(next, /ascii_mode: false/);
  assert.match(next, /no_inline: true/);
  assert.match(next, /inline: true/);
});
