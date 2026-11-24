import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createElement } from "react";
// @ts-expect-error Test renderer has no bundled declarations.
import { act, create } from "react-test-renderer";

import { useData, type Data } from "../src/hooks/useData";
import { useDebouncedSearchText } from "../src/hooks/useDebouncedSearchText";
// @ts-expect-error Mock module.
import { clearMockCache } from "./mocks/raycast-api.mjs";
// @ts-expect-error Mock module.
import { reminderQueries, resetMockState, setQueryHandler } from "./mocks/swift-reminders.mjs";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const lists = [{ id: "work", title: "Work", color: "blue", isDefault: true }];
function result(title: string): Data {
  return {
    lists,
    reminders: [
      {
        id: title,
        title,
        notes: "",
        dueDate: null,
        isCompleted: false,
        priority: null,
        completionDate: "",
        isRecurring: "",
        recurrenceRule: "",
        openUrl: "",
        list: lists[0],
      },
    ],
  };
}

describe("Reminder search loading", () => {
  let root: ReturnType<typeof create>;
  let state: ReturnType<typeof useData>;

  function Search({ text, listId = "all" }: { text: string; listId?: string }) {
    const { debouncedSearchText, isSearchPending } = useDebouncedSearchText(text);
    state = useData(listId, debouncedSearchText, { execute: !isSearchPending });
    return null;
  }

  beforeEach(() => {
    clearMockCache();
    resetMockState();
  });
  afterEach(async () => {
    if (root) await act(() => root.unmount());
  });

  it("clears old rows immediately, keeps the picker, and reads once after typing stops", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    setQueryHandler(async ({ searchText }: { searchText: string }) => result(searchText));
    await act(() => {
      root = create(createElement(Search, { text: "old" }));
    });
    assert.equal(state.data?.reminders[0].title, "old");

    await act(() => root.update(createElement(Search, { text: "n" })));
    assert.equal(state.data, undefined);
    assert.deepEqual(state.lists, lists);
    await act(() => {
      t.mock.timers.tick(200);
    });
    await act(() => root.update(createElement(Search, { text: "new" })));
    await act(() => {
      t.mock.timers.tick(299);
    });
    assert.equal(reminderQueries.length, 1);
    assert.equal(state.data, undefined);
    await act(() => {
      t.mock.timers.tick(1);
    });
    assert.deepEqual(
      reminderQueries.map((query: { searchText: string }) => query.searchText),
      ["old", "new"],
    );
    assert.equal(state.data?.reminders[0].title, "new");
  });

  it("does not show the previous list while a new list is loading or has failed", async (t) => {
    t.mock.method(console, "error", () => {});
    let reject: (error: Error) => void;
    setQueryHandler(({ listId }: { listId: string }) =>
      listId === "all"
        ? Promise.resolve(result("Old"))
        : new Promise<Data>((_, fail) => {
            reject = fail;
          }),
    );
    await act(() => {
      root = create(createElement(Search, { text: "" }));
    });
    await act(() => root.update(createElement(Search, { text: "", listId: "deleted" })));
    assert.equal(state.data, undefined);
    assert.deepEqual(state.lists, lists);
    await act(() => reject(new Error("The selected reminders list no longer exists.")));
    assert.equal(state.data, undefined);
    assert.match(state.error?.message ?? "", /no longer exists/);
  });

  it("ignores an old query that resolves during the debounce delay", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let resolveOld: (data: Data) => void;
    setQueryHandler(({ searchText }: { searchText: string }) =>
      searchText === "old"
        ? new Promise<Data>((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve(result("new")),
    );
    await act(() => {
      root = create(createElement(Search, { text: "old" }));
    });
    await act(() => root.update(createElement(Search, { text: "new" })));
    await act(() => resolveOld(result("old")));
    assert.equal(state.data, undefined);
    await act(() => {
      t.mock.timers.tick(300);
    });
    assert.equal(state.data?.reminders[0].title, "new");
  });
});
