import assert from "node:assert/strict";
import test from "node:test";
import { parseQuery, switchScope } from "../src/search/query";
import {
  effectiveShortcuts,
  loadShortcutConfig,
  raycastShortcut,
} from "../src/shortcuts";

function sourceShortcut(scope: Scope, preference?: string) {
  return raycastShortcut(
    effectiveShortcuts(loadShortcutConfig(undefined, preference).overrides)[
      `source.${scope}`
    ],
  );
}
import type { Scope } from "../src/types";

test("切换来源移除旧前缀，保留拼音和混合关键词", () => {
  assert.deepEqual(switchScope(" /H zhoubao 前端 ", "tab"), {
    input: "zhoubao 前端",
    scope: "tab",
  });
  assert.deepEqual(parseQuery(switchScope("/h zw", "tab").input, "tab"), {
    text: "zw",
    scope: "tab",
  });
});

test("支持空关键词、全部来源，不删除 URL 或未知前缀", () => {
  for (const scope of ["all", "tab", "bookmark", "history"] as const) {
    assert.deepEqual(switchScope("/t", scope), { input: "", scope });
    for (const input of ["https://example.com/h", "/help zw", "周报 zw"]) {
      assert.deepEqual(switchScope(input, scope), { input, scope });
    }
  }
});

test("切换到相同有效来源不会改变实际查询", () => {
  for (const [input, scope] of [
    ["/h zw", "history"],
    ["zw", "tab"],
  ] as [string, Scope][]) {
    const next = switchScope(input, scope);
    assert.deepEqual(
      parseQuery(next.input, next.scope),
      parseQuery(input, scope),
    );
  }
});

test("来源快捷键默认命令组合、可改控制组合或关闭", () => {
  for (const [scope, key] of [
    ["all", "0"],
    ["tab", "1"],
    ["bookmark", "2"],
    ["history", "3"],
  ] as const) {
    assert.deepEqual(sourceShortcut(scope), {
      modifiers: ["cmd", "shift"],
      key,
    });
    assert.deepEqual(sourceShortcut(scope, "cmd-shift"), {
      modifiers: ["cmd", "shift"],
      key,
    });
    assert.deepEqual(sourceShortcut(scope, "ctrl-shift"), {
      modifiers: ["ctrl", "shift"],
      key,
    });
    assert.equal(sourceShortcut(scope, "none"), undefined);
  }
});
