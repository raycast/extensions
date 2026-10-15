import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import path from "node:path";
import { before, test, type TestContext } from "node:test";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { defaultBrowserOptions } from "../src/browser/service-types";
import type { Scope } from "../src/types";
import {
  currentService,
  pendingSearches,
  resolveSearch,
} from "./fixtures/hook-service";

let useBrowserSearch: typeof import("../src/hooks/use-browser-search").useBrowserSearch;
let state: ReturnType<typeof useBrowserSearch>;

before(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      const fixture =
        specifier === "@raycast/api"
          ? "hook-native.ts"
          : specifier === "../browser/service" &&
              context.parentURL?.includes("/hooks/use-browser-search")
            ? "hook-service.ts"
            : undefined;
      if (fixture)
        return {
          url: pathToFileURL(path.join(__dirname, "fixtures", fixture)).href,
          shortCircuit: true,
        };
      return nextResolve(specifier, context);
    },
  });
  try {
    ({ useBrowserSearch } = await import("../src/hooks/use-browser-search"));
  } finally {
    hooks.deregister();
  }
});

interface Props {
  query: string;
  scope: Scope;
}

function Harness({ query, scope }: Props) {
  state = useBrowserSearch(defaultBrowserOptions, query, scope);
  return null;
}

async function mount(t: TestContext) {
  pendingSearches.length = 0;
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(Harness, { query: "demo", scope: "all" }));
  });
  t.after(async () => {
    await act(async () => renderer.unmount());
  });
  await act(async () => t.mock.timers.tick(80));
  const first = pendingSearches[0];
  assert.ok(first);
  await act(async () => resolveSearch(first, "first", 80));
  assert.equal(state.page?.results[0].entry.id, "first");
  return {
    update: async (query: string, scope: Scope = "all") => {
      await act(async () => {
        renderer.update(createElement(Harness, { query, scope }));
      });
    },
    advance: async (ms: number) => {
      await act(async () => t.mock.timers.tick(ms));
    },
  };
}

test("连续输入期间保留同来源的旧结果，新结果就绪后才替换", async (t) => {
  const ui = await mount(t);
  await ui.update("demo react");
  assert.equal(state.page?.results[0].entry.id, "first");
  assert.equal(state.searching, true);
  await ui.advance(80);
  await act(async () => resolveSearch(pendingSearches[1], "latest"));
  assert.equal(state.page?.results[0].entry.id, "latest");
  assert.equal(state.searching, false);
});

test("快速连续输入只搜索最终关键词", async (t) => {
  const ui = await mount(t);
  await ui.update("demo r");
  await ui.advance(40);
  await ui.update("demo re");
  await ui.advance(40);
  await ui.update("demo react");
  await ui.advance(79);
  assert.equal(pendingSearches.length, 1);
  await ui.advance(1);
  assert.equal(pendingSearches.length, 2);
  assert.equal(pendingSearches[1].request.query, "demo react");
});

test("切换来源期间保留旧结果，新来源就绪后整体替换", async (t) => {
  const ui = await mount(t);
  await ui.update("demo", "history");
  assert.equal(state.page?.results[0].entry.id, "first");
  assert.equal(state.searching, true);
  await ui.advance(80);
  await act(async () => resolveSearch(pendingSearches[1], "history"));
  assert.equal(state.page?.results[0].entry.source, "history");
  assert.equal(state.searching, false);
});

test("数据版本变化后不保留旧配置的显示结果", async (t) => {
  await mount(t);
  await act(async () => currentService.refreshSnapshot());
  assert.equal(state.page, undefined);
});

test("较早查询的迟到响应不能覆盖最新结果", async (t) => {
  const ui = await mount(t);
  await ui.update("demo old");
  await ui.advance(80);
  const old = pendingSearches[1];
  await ui.update("demo new");
  await ui.advance(80);
  await act(async () => resolveSearch(pendingSearches[2], "new"));
  await act(async () => resolveSearch(old, "old"));
  assert.equal(state.page?.results[0].entry.id, "new");
});

test("等待新查询时不能对保留的旧列表继续分页", async (t) => {
  const ui = await mount(t);
  await ui.update("demo new");
  const count = pendingSearches.length;
  await state.loadMore();
  assert.equal(pendingSearches.length, count);
});
