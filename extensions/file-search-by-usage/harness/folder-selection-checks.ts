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
    return null;
  }
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  try {
    function FreshFolder({ entries }: { entries: typeof rows }) {
      renders++;
      current = useFolderSelection(undefined, entries, 1, "", 0, true);
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
      current!.selectedId === null,
      "first-row focus waits for Raycast to register the new folder's items",
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
      current!.selectedId === "1:/foo/bar249" &&
        current!.getSelectedPath() === "/foo/bar249",
      "acknowledging an early first row does not strand focus below later results",
    );
    await act(() => current.onSelectionChange("1:/foo/bar0"));
    assert(
      current!.selectedId === "1:/foo/bar249",
      "a delayed report of the previously requested row does not cancel top focus",
    );
    await act(() => current.onSelectionChange("1:/foo/bar249"));
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
    await act(() => renderer!.unmount());
    await act(() => {
      renderer = create(React.createElement(View, { entries: [] }));
    });
    await act(() => current.onSelectionChange("1:/foo/bar0"));
    await act(() =>
      renderer!.update(React.createElement(View, { entries: rows })),
    );
    assert(
      current!.selectedId === null,
      "restored folder focus also waits until native rows are registered",
    );
    await act(() => current.onSelectionChange("1:/foo/bar0"));
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
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
