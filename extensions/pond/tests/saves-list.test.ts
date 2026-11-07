import assert from "node:assert/strict";
import { test } from "node:test";
import { Children, isValidElement, type ReactElement } from "react";
import type { ApiView } from "pond-api";
import { loadSource } from "./load-source";

test("saved-view loading failures show an error and retry; unrelated filters remain usable", async () => {
  const error = new Error("Views request failed");
  let retries = 0;
  let execute: boolean | undefined;
  const views = {
    data: undefined as ApiView[] | undefined,
    error: error as Error | undefined,
    isLoading: false,
    revalidate: () => retries++,
  };
  const { SavesList } = await loadSource<typeof import("../src/components/saves-list")>("components/saves-list.tsx", {
    "@raycast/api": {
      Action: { Open: "Open" },
      ActionPanel: "ActionPanel",
      Icon: {},
      List: { EmptyView: "EmptyView", Section: "Section" },
      useNavigation: () => ({ push: () => {} }),
    },
    "@raycast/utils": {
      useCachedState: (_key: string, initial: unknown) => [initial, () => {}],
      useCachedPromise: (_fn: unknown, args: unknown[], options: { execute: boolean }) => {
        if (args.length) execute = options.execute;
        return { data: [], isLoading: false, revalidate: () => {}, mutate: () => {} };
      },
    },
    react: { useState: (value: unknown) => [value, () => {}], useMemo: (fn: () => unknown) => fn() },
    "../api/client": {},
    "../lib/edits": { saveEditor: () => ({}) },
    "../lib/files": { useQuickLook: () => undefined },
    "../lib/library": {
      useLookups: () => ({ revalidate: () => {} }),
      useViews: () => views,
      useSources: () => ({ revalidate: () => {} }),
    },
    "../lib/recent": {},
    "../lib/thumbnails": { useThumbnails: () => ({ paths: new Map(), retry: () => {} }) },
    "./filter-dropdown": { filterTitle: () => "Saved View", FilterDropdown: "FilterDropdown" },
    "./problem": { ProblemView: "ProblemView" },
    "./save-item": { SaveItem: "SaveItem" },
  });
  function emptyView(filter: Parameters<typeof SavesList>[0]["filter"]) {
    const list = SavesList({ filter });
    const child = Children.toArray(list.props.children).find(
      (item) => isValidElement(item) && (item.type === "ProblemView" || item.type === "EmptyView"),
    );
    assert.ok(isValidElement(child));
    return child as ReactElement<{ error?: Error; onRetry?: () => void }>;
  }

  const failed = emptyView({ kind: "view", id: "view-1" });
  assert.equal(execute, false, "saves cannot load without the view definition");
  assert.equal(failed.type, "ProblemView");
  assert.equal(failed.props.error, error);
  assert.ok(failed.props.onRetry);
  failed.props.onRetry();
  assert.equal(retries, 1, "retry reloads the failed views request");

  assert.equal(emptyView({ kind: "folder", id: "folder-1" }).type, "EmptyView");
  assert.equal(execute, true, "other filters do not depend on views");

  views.error = undefined;
  views.data = [
    {
      id: "view-1",
      name: "Saved View",
      kind: "saved_view",
      parentId: null,
      query: { combinator: "and", rules: [] },
      sortKey: "savedAt",
      sortDir: "desc",
    },
  ];
  assert.equal(emptyView({ kind: "view", id: "view-1" }).type, "EmptyView");
  assert.equal(execute, true, "loading the view definition enables the saves request");
});
