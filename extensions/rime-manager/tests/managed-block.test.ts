import assert from "node:assert/strict";
import test from "node:test";

import { replaceManagedPatchBlock } from "../src/lib/managed-block";

const START = "# >>> Raycast Test";
const END = "# <<< Raycast Test";

test("inserts a managed block beneath the existing patch key", () => {
  const source = `# user comment\npatch:\n  style:\n    font_point: 18\n`;
  const next = replaceManagedPatchBlock(source, START, END, ['"pin_cand_filter/+":', '  - "ni hao\\t你好"']);
  assert.match(next, /patch:\n# >>> Raycast Test\n  "pin_cand_filter\/\+":\n    - "ni hao\\t你好"\n# <<< Raycast Test/);
  assert.match(next, /style:\n    font_point: 18/);
});

test("replaces only the previous managed block", () => {
  const first = replaceManagedPatchBlock("patch:\n  style/color_scheme: macos_light\n", START, END, [
    '"pin_cand_filter/+":',
    '  - "a\\t啊"',
  ]);
  const second = replaceManagedPatchBlock(first, START, END, ['"pin_cand_filter/+":', '  - "b\\t吧"']);
  assert.doesNotMatch(second, /a\\t啊/);
  assert.match(second, /b\\t吧/);
  assert.match(second, /style\/color_scheme: macos_light/);
});

test("removes a managed block without touching user configuration", () => {
  const source = `patch:\n${START}\n  "pin_cand_filter/+":\n    - "a\\t啊"\n${END}\n  style/color_scheme: macos_light\n`;
  const next = replaceManagedPatchBlock(source, START, END, undefined);
  assert.equal(next, "patch:\n  style/color_scheme: macos_light\n");
});
