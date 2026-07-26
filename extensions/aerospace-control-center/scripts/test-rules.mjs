import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../src/utils/rule-config.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});
const directory = mkdtempSync(join(tmpdir(), "aerospace-rule-tests-"));
const modulePath = join(directory, "rule-config.cjs");
writeFileSync(modulePath, compiled.outputText);

try {
  const { recommendedFloatingRules, updateWindowRuleContent } = require(modulePath);
  let passed = 0;
  const test = (name, callback) => {
    callback();
    passed += 1;
    console.log(`✓ ${name}`);
  };

  test("preserves tables following an edited window rule", () => {
    const input = `start-at-login = true

[[on-window-detected]]
if.app-id = "com.example.Chat"
run = "layout floating"

# Keep this binding comment.
[mode.main.binding]
alt-enter = "exec-and-forget open -a Terminal"
`;
    const output = updateWindowRuleContent(input, {
      bundleId: "com.example.Chat",
      appName: "Chat",
      floating: false,
      workspace: "4",
    });
    assert.match(output, /run = "move-node-to-workspace 4"/);
    assert.match(output, /# Keep this binding comment\.\n\[mode\.main\.binding\]/);
    assert.match(output, /alt-enter = "exec-and-forget open -a Terminal"/);
  });

  test("preserves unrelated commands in a compatible single-line rule", () => {
    const input = `[[on-window-detected]]
if.app-id = "com.example.Chat"
run = ["layout floating", "move-node-to-workspace 2", "exec-and-forget notify"]
`;
    const output = updateWindowRuleContent(input, {
      bundleId: "com.example.Chat",
      appName: "Chat",
      floating: true,
      workspace: "7",
    });
    assert.match(output, /run = \["move-node-to-workspace 7", "layout floating", "exec-and-forget notify"\]/);
  });

  test("refuses to mix inline and array-table rule formats", () => {
    const input = `on-window-detected = [
  { if = "test", run = "layout floating" },
]

[mode.main.binding]
alt-enter = "terminal"
`;
    assert.throws(
      () =>
        updateWindowRuleContent(input, {
          bundleId: "com.example.Chat",
          appName: "Chat",
          floating: true,
          workspace: "",
        }),
      /inline on-window-detected rules/,
    );
  });

  test("refuses to rewrite rules with additional conditions", () => {
    const input = `[[on-window-detected]]
if.app-id = "com.example.Chat"
if.window-title-regex-substring = "Meeting"
run = "layout floating"
`;
    assert.throws(
      () =>
        updateWindowRuleContent(input, {
          bundleId: "com.example.Chat",
          appName: "Chat",
          floating: false,
          workspace: "3",
        }),
      /additional conditions or settings/,
    );
  });

  test("generates recommended rules in the editable array-table format", () => {
    const output = recommendedFloatingRules([
      ["Chat", "com.example.Chat"],
      ["Messages", "com.example.Messages"],
    ]);
    assert.doesNotMatch(output, /^on-window-detected\s*=/m);
    assert.equal((output.match(/\[\[on-window-detected\]\]/g) || []).length, 2);
    assert.match(output, /if\.app-id = "com\.example\.Chat"/);
  });

  console.log(`\n${passed} rule configuration tests passed.`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
