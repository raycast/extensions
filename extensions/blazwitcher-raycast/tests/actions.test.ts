import assert from "node:assert/strict";
import test from "node:test";
import {
  executeResultAction,
  resultActions,
  type CapturedContext,
} from "../src/actions";
import {
  effectiveShortcuts,
  loadShortcutConfig,
  serializeShortcuts,
  validateShortcuts,
} from "../src/shortcuts";
import type { BrowserEntry } from "../src/types";

const entry: BrowserEntry = {
  id: "tab:7",
  source: "tab",
  tabId: "7",
  title: "页面",
  url: "https://example.com/",
};
const captured = Promise.resolve({ context: { windowId: "3", tabId: "7" } });
function operations(calls: unknown[]) {
  return {
    open: async (value: BrowserEntry) => {
      calls.push(["open", value]);
    },
    openUrl: async (...args: unknown[]) => {
      calls.push(args);
    },
    copy: async (url: string) => {
      calls.push(["copy", url]);
    },
  };
}

test("所有来源保持打开、新标签、当前标签、复制的统一动作顺序", () => {
  for (const source of ["tab", "bookmark", "history"] as const) {
    assert.deepEqual(
      resultActions(source).map(({ kind }) => kind),
      ["open", "newTab", "here", "copy"],
    );
  }
});

test("捕获 Chrome 失败不阻止复制和独立打开", async () => {
  const calls: unknown[] = [];
  const failed = Promise.resolve({ error: new Error("capture failed") });
  for (const kind of ["copy", "open"] as const)
    await executeResultAction(kind, () => entry, failed, operations(calls));
  assert.deepEqual(calls, [
    ["copy", entry.url],
    ["open", entry],
  ]);
  await assert.rejects(
    executeResultAction("here", () => entry, failed, operations(calls)),
    /capture failed/,
  );
});

test("当前页和新标签页使用启动时捕获的目标及完整地址", async () => {
  const calls: unknown[] = [];
  for (const kind of ["here", "newTab"] as const)
    await executeResultAction(kind, () => entry, captured, operations(calls));
  assert.deepEqual(calls, [
    [entry.url, "here", { windowId: "3", tabId: "7" }],
    [entry.url, "newTab", { windowId: "3", tabId: "7" }],
  ]);
});

test("等待捕获期间结果失效时拒绝操作", async () => {
  let release!: (value: { context: null }) => void;
  const pending: CapturedContext = new Promise((resolve) => {
    release = resolve;
  });
  let live = true;
  const calls: unknown[] = [];
  const operation = executeResultAction(
    "newTab",
    () => {
      if (!live) throw new Error("结果已更新");
      return entry;
    },
    pending,
    operations(calls),
  );
  live = false;
  release({ context: null });
  await assert.rejects(operation, /结果已更新/);
  assert.deepEqual(calls, []);
});

test("快捷键迁移一次，保存覆盖值后不再使用旧偏好", () => {
  const migrated = loadShortcutConfig(undefined, "ctrl-shift");
  assert.equal(migrated.needsSave, true);
  const loaded = loadShortcutConfig(
    serializeShortcuts(migrated.overrides),
    "none",
  );
  assert.equal(loaded.needsSave, false);
  assert.equal(
    effectiveShortcuts(loaded.overrides)["source.tab"],
    "ctrl+shift+1",
  );
  assert.equal(
    effectiveShortcuts(loadShortcutConfig(undefined, "none").overrides)[
      "source.tab"
    ],
    null,
  );
});

test("新增详情快捷键不会覆盖已保存的合法 cmd+d 绑定", () => {
  const overrides = { copy: "cmd+d" };
  assert.deepEqual(validateShortcuts(overrides), []);
  assert.equal(effectiveShortcuts(overrides).toggleDetail, null);
  assert.ok(validateShortcuts({ ...overrides, toggleDetail: "cmd+d" }).length);
});

test("同来源与通用动作不能冲突，不同来源的专属动作可复用按键", () => {
  assert.deepEqual(
    validateShortcuts({ "tab.open": "ctrl+o", "bookmark.open": "ctrl+o" }),
    [],
  );
  assert.ok(validateShortcuts({ copy: "ctrl+o", "tab.open": "ctrl+o" }).length);
  assert.ok(
    validateShortcuts({ "tab.open": "ctrl+o", "tab.here": "ctrl+o" }).length,
  );
  for (const shortcut of ["cmd+enter", "cmd+k", "a", "shift+a"])
    assert.ok(validateShortcuts({ copy: shortcut }).length);
});

test("配置损坏时提示修复，恢复默认不再迁移旧偏好", () => {
  assert.ok(loadShortcutConfig("invalid").error);
  assert.ok(loadShortcutConfig('{"version":1,"overrides":{"copy":42}}').error);
  assert.ok(
    loadShortcutConfig('{"version":1,"overrides":{"unknown":"cmd+r"}}').error,
  );
  const defaults = loadShortcutConfig(serializeShortcuts({}), "none");
  assert.equal(defaults.error, undefined);
  assert.equal(
    effectiveShortcuts(defaults.overrides)["source.tab"],
    "cmd+shift+1",
  );
});
