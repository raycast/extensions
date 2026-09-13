import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { useFolderSelection } from "../src/components/use-folder-selection";
import { Entry } from "../src/lib/types";

export async function folderSelectionChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const rows = Array.from({ length: 250 }, (_, index) => ({
    entry: {
      path: `/foo/bar${index}`,
      name: `bar${index}`,
      isDirectory: true,
      isSymlink: false,
      size: 0,
      mtimeMs: 0,
      birthtimeMs: 0,
    } satisfies Entry,
  }));
  let current: ReturnType<typeof useFolderSelection>;
  let renders = 0;
  const selectionCommits: (string | null)[] = [];
  function View({
    entries,
    query = "",
    generation = 1,
    initialPath = "/foo/bar249",
    restorationRevision = 0,
  }: {
    entries: typeof rows;
    query?: string;
    generation?: number;
    initialPath?: string;
    restorationRevision?: number;
  }) {
    renders++;
    current = useFolderSelection(
      initialPath,
      entries,
      generation,
      query,
      restorationRevision,
    );
    React.useLayoutEffect(() => {
      selectionCommits.push(current.selectedId);
    });
    return null;
  }
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  try {
    function FreshFolder({
      entries,
      generation = 1,
    }: {
      entries: typeof rows;
      generation?: number;
    }) {
      renders++;
      current = useFolderSelection(undefined, entries, generation, "", 0, true);
      React.useLayoutEffect(() => {
        selectionCommits.push(current.selectedId);
      });
      return null;
    }
    await act(() => {
      renderer = create(React.createElement(FreshFolder, { entries: [] }));
    });
    await act(() => current.onSelectionChange("1:/old/folder"));
    await act(() =>
      renderer!.update(React.createElement(FreshFolder, { entries: rows })),
    );
    assert(
      current!.selectedId === "1:/foo/bar0",
      "a populated folder requests its first row even without a native selection event",
    );
    await act(() => current.onSelectionChange("1:/foo/bar4"));
    assert(
      current!.selectedId === "1:/foo/bar0",
      "Raycast's initial restored selection is replaced with the first folder row",
    );
    await act(() => current.onSelectionChange("1:/foo/bar0"));
    const beforeAcknowledgements = renders;
    for (let i = 0; i < 20; i++) {
      await act(() => current.onSelectionChange("1:/foo/bar0"));
    }
    assert(
      renders === beforeAcknowledgements,
      "repeated first-row acknowledgements do not create selection render loops",
    );
    await act(() =>
      renderer!.update(
        React.createElement(FreshFolder, { entries: [...rows].reverse() }),
      ),
    );
    assert(
      current!.selectedId === "1:/foo/bar0" &&
        current!.getSelectedPath() === "/foo/bar0",
      "later ranking changes keep the initial memory selection instead of chasing the top row",
    );
    await act(() => current.onSelectionChange("1:/foo/bar248"));
    const beforeRefresh = renders;
    await act(() => current.onSelectionChange("1:/foo/bar248"));
    assert(
      current!.selectedId === null &&
        current!.getSelectedPath() === "/foo/bar248" &&
        renders === beforeRefresh,
      "initial top-row focus releases control without echoing subsequent selection",
    );
    await act(() =>
      renderer!.update(
        React.createElement(FreshFolder, { entries: rows.slice(1) }),
      ),
    );
    assert(
      current!.selectedId === null,
      "later folder updates do not repeatedly force selection to the top",
    );
    await act(() => current.onSelectionChange(null));
    assert(
      current!.selectedId === "1:/foo/bar1" &&
        current!.getSelectedPath() === "/foo/bar1",
      "losing native selection in a nonempty list recovers a usable first row",
    );
    await act(() => current.onSelectionChange("1:/foo/bar1"));
    await act(() => current.onSelectionChange("1:/foo/bar2"));
    await act(() =>
      renderer!.update(React.createElement(FreshFolder, { entries: [] })),
    );
    await act(() => current.onSelectionChange(null));
    await act(() =>
      renderer!.update(React.createElement(FreshFolder, { entries: rows })),
    );
    assert(
      current!.selectedId === "1:/foo/bar0",
      "an empty refresh rearms selection before the same folder is repopulated",
    );
    await act(() => current.onSelectionChange("1:/foo/bar0"));
    await act(() =>
      renderer!.update(
        React.createElement(FreshFolder, { entries: rows, generation: 2 }),
      ),
    );
    await act(() => current.onSelectionChange("2:/foo/bar12"));
    assert(
      current!.selectedId === "2:/foo/bar0",
      "acknowledging the same path under an old row ID does not release a new focus request",
    );
    await act(() => renderer!.unmount());
    await act(() => {
      renderer = create(React.createElement(View, { entries: [] }));
    });
    await act(() => current.onSelectionChange("1:/foo/bar0"));
    await act(() =>
      renderer!.update(React.createElement(View, { entries: rows })),
    );
    assert(
      current!.selectedId === "1:/foo/bar249",
      "parent-folder focus does not depend on receiving a native selection event",
    );
    selectionCommits.length = 0;
    await act(() => current.onSelectionChange("1:/foo/bar0"));
    assert(
      selectionCommits.includes(null) &&
        selectionCommits.at(-1) === "1:/foo/bar249",
      "parent selection is reissued after a late automatic selection of an intermediate cached row",
    );
    assert(
      current!.selectedId === "1:/foo/bar249",
      "the folder just left is selected when it arrives, even beyond the first page",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, { entries: [...rows].reverse() }),
      ),
    );
    assert(
      current!.selectedId === "1:/foo/bar249",
      "parent-folder selection stays attached to the folder during reranking",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, { entries: rows, generation: 2 }),
      ),
    );
    assert(
      current!.selectedId === "2:/foo/bar249",
      "the initial results refresh does not undo parent-folder focus",
    );
    await act(() =>
      renderer!.update(React.createElement(View, { entries: rows })),
    );
    await act(() => current.onSelectionChange("1:/foo/bar249"));
    assert(
      current!.selectedId === null,
      "acknowledging restored folder focus releases controlled selection",
    );
    await act(() => current.onSelectionChange("1:/foo/bar1"));
    await act(() =>
      renderer!.update(React.createElement(View, { entries: rows })),
    );
    assert(
      current!.getSelectedPath() === "/foo/bar1" &&
        current!.selectedId === null,
      "users can move selection after the initial folder has been highlighted",
    );
    const beforeRepeatedSelection = renders;
    for (let i = 0; i < 20; i++) {
      await act(() => current.onSelectionChange("1:/foo/bar1"));
    }
    assert(
      renders - beforeRepeatedSelection <= 1,
      "repeated native selection notifications do not keep rerendering the list",
    );
    const beforeAlternatingSelection = renders;
    for (let i = 0; i < 20; i++) {
      await act(() => current.onSelectionChange(`1:/foo/bar${i % 2}`));
    }
    assert(
      renders === beforeAlternatingSelection,
      "native selection changes do not rebuild or echo the entire result list",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          entries: rows,
          query: "bar",
          generation: 2,
        }),
      ),
    );
    assert(
      current!.selectedId === null,
      "a new query does not retain a selection ID from the previous results",
    );
    await act(() =>
      renderer!.update(React.createElement(View, { key: "new", entries: [] })),
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "new",
          entries: [],
          query: "baz",
          generation: 2,
        }),
      ),
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, { key: "new", entries: rows, generation: 3 }),
      ),
    );
    assert(
      current!.selectedId === null,
      "typing cancels pending parent-folder focus so late results do not steal selection",
    );
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "restored",
          entries: rows,
          query: "bar",
          generation: 4,
        }),
      ),
    );
    await act(() => current.onSelectionChange("4:/foo/bar0"));
    assert(
      current!.selectedId === "4:/foo/bar249",
      "Escape can restore the selected folder in a nonempty search query",
    );
    await act(() => current.onSelectionChange("4:/foo/bar249"));
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "restored",
          entries: rows,
          query: "bar",
          generation: 4,
          initialPath: "/foo/bar1",
          restorationRevision: 1,
        }),
      ),
    );
    await act(() => current.onSelectionChange("4:/foo/bar249"));
    assert(
      current!.selectedId === "4:/foo/bar1",
      "returning to a mounted setup owner rearms the requested folder selection",
    );
    await act(() => current.onSelectionChange("4:/foo/bar1"));
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "restored",
          entries: rows,
          query: "bar",
          generation: 4,
          initialPath: "/foo/bar1",
          restorationRevision: 2,
        }),
      ),
    );
    await act(() => current.onSelectionChange("4:/foo/bar249"));
    assert(
      current!.selectedId === "4:/foo/bar1",
      "returning to the same mounted folder can restore the same selection again",
    );
    await act(() => current.onSelectionChange("4:/foo/bar249"));
    await act(() =>
      renderer!.update(
        React.createElement(View, {
          key: "restored",
          entries: rows,
          query: "bar",
          generation: 4,
          initialPath: "/foo/bar249",
          restorationRevision: 3,
        }),
      ),
    );
    await act(() => current.onSelectionChange("4:/foo/bar1"));
    assert(
      current!.getSelectedPath() === "/foo/bar1",
      "a user selection wins over a pending restored folder before navigation",
    );
    await act(() => renderer!.unmount());

    // Drive only the selection timer; no filesystem or Spotlight work is mocked.
    const realSetTimeout = globalThis.setTimeout;
    const realClearTimeout = globalThis.clearTimeout;
    let now = 0;
    let timerId = 0;
    const timers = new Map<number, { at: number; run: () => void }>();
    globalThis.setTimeout = ((run: () => void, delay = 0) => {
      const id = ++timerId;
      timers.set(id, { at: now + delay, run });
      return id;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = ((id: number) => {
      timers.delete(id);
    }) as unknown as typeof clearTimeout;
    const advance = async (ms: number) => {
      await act(() => {
        now += ms;
        for (const [id, timer] of [...timers]) {
          if (timer.at > now) continue;
          timers.delete(id);
          timer.run();
        }
      });
    };
    function TimedFolder({
      entries = rows,
      query = "foo",
      source = "spotlight",
      memoryPath,
      memoryPending = false,
    }: {
      entries?: typeof rows;
      query?: string;
      source?: "memory" | "spotlight" | "waiting";
      memoryPath?: string;
      memoryPending?: boolean;
    }) {
      current = useFolderSelection(undefined, entries, 1, query, 0, true, {
        source,
        path: memoryPath,
        memoryPending,
      });
      return null;
    }
    try {
      await act(() => {
        renderer = create(
          React.createElement(TimedFolder, { source: "waiting" }),
        );
      });
      assert(
        current!.selectedId === null,
        "selection waits until ranking data and rendered rows are ready",
      );
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            source: "memory",
            memoryPath: "/foo/bar4",
          }),
        ),
      );
      assert(
        current!.selectedId === "1:/foo/bar4",
        "the first usable memory batch selects its own top item, even in mixed results",
      );
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            source: "memory",
            memoryPath: "/foo/bar8",
            entries: [...rows].reverse(),
          }),
        ),
      );
      assert(
        current!.selectedId === "1:/foo/bar4",
        "later memory batches do not change the chosen initial target",
      );
      await act(() => current.onSelectionChange("1:/foo/bar12"));
      assert(
        current!.selectedId === "1:/foo/bar4",
        "rearming an unacknowledged memory request keeps its original target after reranking",
      );
      await act(() => current.onSelectionChange("1:/foo/bar4"));
      await act(() => current.onSelectionChange("1:/foo/bar5"));
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            source: "memory",
            memoryPath: "/foo/bar0",
          }),
        ),
      );
      assert(
        current!.selectedId === null &&
          current!.getSelectedPath() === "/foo/bar5",
        "memory updates preserve a manual selection",
      );

      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, { query: "bar", entries: [] }),
        ),
      );
      await advance(300);
      await act(() =>
        renderer!.update(React.createElement(TimedFolder, { query: "bar" })),
      );
      assert(
        current!.selectedId === null,
        "Spotlight delay starts when results appear, not when typing begins",
      );
      await advance(199);
      assert(
        current!.selectedId === null,
        "Spotlight-only results do not force selection before 200 ms",
      );
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            query: "bar",
            entries: [...rows].reverse(),
          }),
        ),
      );
      await advance(1);
      assert(
        current!.selectedId === "1:/foo/bar249",
        "at 200 ms select the latest top Spotlight row without restarting the timer on batches",
      );
      await act(() =>
        renderer!.update(React.createElement(TimedFolder, { query: "bar" })),
      );
      assert(
        current!.selectedId === "1:/foo/bar249",
        "later Spotlight results keep the selected item stable",
      );

      await act(() =>
        renderer!.update(React.createElement(TimedFolder, { query: "baz" })),
      );
      await advance(100);
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            query: "baz",
            source: "memory",
            memoryPath: "/foo/bar8",
          }),
        ),
      );
      assert(
        current!.selectedId === "1:/foo/bar8",
        "memory arriving during the Spotlight delay wins immediately",
      );
      await advance(200);
      assert(
        current!.selectedId === "1:/foo/bar8",
        "the cancelled Spotlight timer cannot overwrite the memory selection",
      );

      await act(() =>
        renderer!.update(React.createElement(TimedFolder, { query: "old" })),
      );
      await advance(150);
      await act(() =>
        renderer!.update(React.createElement(TimedFolder, { query: "new" })),
      );
      await advance(50);
      assert(
        current!.selectedId === null,
        "rapid typing cancels the previous query's selection timer",
      );
      await advance(150);
      assert(
        current!.selectedId === "1:/foo/bar0",
        "a new query receives its own initial selection",
      );

      await act(() =>
        renderer!.update(React.createElement(TimedFolder, { query: "manual" })),
      );
      await act(() => current.onSelectionChange("1:/foo/bar0"));
      await act(() => current.onSelectionChange("1:/foo/bar2"));
      await advance(200);
      assert(
        current!.selectedId === null &&
          current!.getSelectedPath() === "/foo/bar2",
        "moving selection during the settling delay cancels automatic selection",
      );
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            query: "removed",
            source: "memory",
            memoryPath: "/foo/bar8",
          }),
        ),
      );
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            query: "removed",
            source: "memory",
            entries: rows.filter(({ entry }) => entry.path !== "/foo/bar8"),
          }),
        ),
      );
      assert(
        current!.selectedId === "1:/foo/bar0",
        "removing the initially selected item recovers focus on an available memory result",
      );
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            query: "batch",
            source: "memory",
            entries: rows.slice(0, 1),
            memoryPending: true,
          }),
        ),
      );
      assert(
        current!.selectedId === null,
        "a lone early memory result waits for the initial memory batch",
      );
      await advance(50);
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            query: "batch",
            source: "memory",
            memoryPath: "/foo/bar4",
          }),
        ),
      );
      assert(
        current!.selectedId === "1:/foo/bar4",
        "finishing the initial memory batch selects its best item without using the full delay",
      );
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            query: "slow-memory",
            source: "memory",
            memoryPending: true,
          }),
        ),
      );
      await advance(199);
      assert(
        current!.selectedId === null,
        "memory collection receives a bounded settling window",
      );
      await advance(1);
      assert(
        current!.selectedId === "1:/foo/bar0",
        "slow memory checks cannot postpone initial selection beyond 200 ms of usable results",
      );
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, { query: "revisited" }),
        ),
      );
      await act(() => current.onSelectionChange("1:/foo/bar0"));
      await advance(200);
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, {
            query: "intermediate",
            entries: [],
          }),
        ),
      );
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, { query: "revisited" }),
        ),
      );
      await act(() => current.onSelectionChange("1:/foo/bar9"));
      await advance(200);
      assert(
        current!.selectedId === "1:/foo/bar0",
        "revisiting a query does not mistake an old selection for new manual navigation",
      );
      await act(() =>
        renderer!.update(
          React.createElement(TimedFolder, { query: "closing" }),
        ),
      );
      assert(
        timers.size === 1,
        "a Spotlight-only query owns just one settling timer",
      );
      await act(() => renderer!.unmount());
      assert(
        timers.size === 0,
        "unmounting releases outstanding selection timers",
      );
    } finally {
      await act(() => renderer!.unmount());
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
    }
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
