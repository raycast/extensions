import { buildSync } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";

/** Count actual JSX allocations, including trees Raycast never mounts. */
export async function rowRenderChecks(
  assert: (ok: boolean, label: string) => void,
) {
  let selected = "row-0";
  let isDirectory = true;
  let menuElements = 0;
  let detailElements = 0;
  const component = (name: string) =>
    Object.assign(
      (props: { children?: React.ReactNode; metadata?: React.ReactNode }) =>
        React.createElement(
          name,
          props,
          name === "detail" ? props.metadata : props.children,
        ),
      { displayName: name },
    );
  const Item = Object.assign(
    (props: {
      id: string;
      actions: React.ReactNode;
      detail: React.ReactNode;
    }) =>
      props.id === selected
        ? React.createElement(React.Fragment, null, props.actions, props.detail)
        : null,
    {
      Detail: Object.assign(component("detail"), {
        Metadata: Object.assign(component("metadata"), {
          Label: component("metadata-label"),
          Separator: component("metadata-separator"),
        }),
      }),
    },
  );
  const api = {
    List: { Item },
    Action: Object.assign(component("action"), {
      ToggleQuickLook: "action-quicklook",
      ShowInFinder: "action-finder",
      OpenWith: "action-openwith",
      CopyToClipboard: "action-copy",
      Trash: "action-trash",
      Style: { Destructive: "destructive" },
    }),
    ActionPanel: Object.assign(component("action-panel"), {
      Section: "action-section",
    }),
    Icon: new Proxy({}, { get: (_target, key) => key }),
    Keyboard: {
      Shortcut: {
        Common: {
          Open: { modifiers: ["cmd"], key: "o" },
          MoveDown: { modifiers: ["cmd", "opt"], key: "arrowDown" },
          MoveUp: { modifiers: ["cmd", "opt"], key: "arrowUp" },
          CopyName: { modifiers: ["cmd", "opt"], key: "c" },
          Copy: { modifiers: ["cmd", "shift"], key: "c" },
        },
      },
    },
  };
  const output = buildSync({
    entryPoints: ["src/components/row.tsx"],
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    external: ["@raycast/api", "react"],
    jsx: "transform",
    jsxFactory: "element",
    jsxFragment: "React.Fragment",
    tsconfigRaw: { compilerOptions: { jsx: "react" } },
  }).outputFiles[0].text;
  const nativeRequire = createRequire(path.resolve("package.json"));
  const module = {
    exports: {} as { Row: React.ComponentType<Record<string, unknown>> },
  };
  const element: typeof React.createElement = (
    type: any,
    props: any,
    ...children: any[]
  ) => {
    const name = typeof type === "string" ? type : (type.displayName ?? "");
    if (name.startsWith("action")) menuElements++;
    if (name.startsWith("metadata") || type === Item.Detail) detailElements++;
    return React.createElement(type, props, ...children);
  };
  new Function("require", "module", "exports", "element", "React", output)(
    (id: string) => (id === "@raycast/api" ? api : nativeRequire(id)),
    module,
    module.exports,
    element,
    React,
  );
  const calls: string[] = [];
  const handlers = {
    onOpen: (entry: { path: string }) => calls.push(entry.path),
    onDescend: (entry: { path: string }) => calls.push(`enter:${entry.path}`),
    onUp: () => calls.push("up"),
    onHistoryBack: () => calls.push("previous"),
    onHistoryForward: () => calls.push("next"),
    onToggleHidden: () => calls.push("hidden"),
    onReturnToStart: (() => calls.push("start")) as (() => void) | undefined,
  };
  const setupActions = {
    setup: { recents: true, drive: true, hasRun: true },
    importing: false,
    start: () => calls.push("setup"),
    cancel: () => {},
    skip: () => {},
  };
  const rows = () =>
    React.createElement(
      React.Fragment,
      null,
      Array.from({ length: 500 }, (_, i) =>
        React.createElement(module.exports.Row, {
          key: i,
          id: `row-${i}`,
          entry: {
            path: `/foo/bar${i}`,
            name: `bar${i}`,
            isDirectory,
            size: 0,
            mtimeMs: 0,
            birthtimeMs: 0,
          },
          score: {
            total: 0,
            visit: 0,
            mtime: 0,
            spotlight: 0,
            depth: 0,
            match: 0,
          },
          showScore: false,
          showingDetail: true,
          pinned: false,
          handlers,
          setupActions,
        }),
      ),
    );
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(() => {
      renderer = create(rows());
    });
    assert(
      menuElements < 100,
      `500 rows construct only the selected action menu (${menuElements} elements)`,
    );
    assert(
      detailElements < 100,
      `500 rows construct only the selected details (${detailElements} elements)`,
    );
    selected = "row-499";
    menuElements = detailElements = 0;
    await act(() => renderer!.update(rows()));
    assert(
      menuElements < 100 && detailElements < 100,
      "changing selection does not build 500 menus or detail panels",
    );
    const actions = renderer!.root.findAllByType("action");
    const checkPrimaryActions = () => {
      const ordered = renderer!.root.findAll(
        (item) =>
          typeof item.type === "string" &&
          [
            "action",
            "action-finder",
            "action-quicklook",
            "action-openwith",
            "action-copy",
            "action-trash",
          ].includes(item.type),
      );
      assert(
        ordered[0]?.props.title === (isDirectory ? "Open in Finder" : "Open") &&
          ordered
            .slice(0, 4)
            .map((item) => item.type)
            .join(",") ===
            "action,action-finder,action-quicklook,action-openwith" &&
          ordered[1]?.props.path === "/foo/bar499",
        `${isDirectory ? "folder" : "file"} menu reserves the secondary Command-Return action for Show in Finder and follows File Search order`,
      );
    };
    checkPrimaryActions();
    const action = (title: string) =>
      actions.find((item) => item.props.title === title)!;
    const hiddenAction = action("Toggle Hidden Files");
    const returnAction = action("Return to Start");
    returnAction?.props.onAction();
    assert(
      calls.pop() === "start" &&
        returnAction?.props.shortcut?.key === "h" &&
        returnAction?.props.shortcut?.modifiers.join() === "cmd,shift",
      "Return to Start registers Command-Shift-H and dispatches the reset",
    );
    hiddenAction?.props.onAction();
    assert(
      calls.pop() === "hidden" &&
        hiddenAction?.props.shortcut.modifiers.slice().sort().join() ===
          "cmd,shift" &&
        hiddenAction?.props.shortcut.key === ".",
      "Toggle Hidden Files uses shift-command-period and invokes its handler",
    );
    assert(
      !action("Back to Previous Folder") &&
        !actions.some(
          (item) =>
            item.props.shortcut?.key === "arrowLeft" &&
            item.props.shortcut.modifiers.join() === "opt",
        ),
      "result actions do not expose removed folder-history navigation",
    );
    action("Open in Finder").props.onAction();
    action("Navigate into Folder").props.onAction();
    action("Go to Parent Folder").props.onAction();
    action("Set Up Search").props.onAction();
    assert(
      calls.join(",") === "/foo/bar499,enter:/foo/bar499,up,setup",
      "deferred actions operate on the newly selected item and keep setup available",
    );
    action("Previous Search").props.onAction();
    action("Next Search").props.onAction();
    assert(
      calls.slice(-2).join() === "previous,next" &&
        action("Previous Search").props.shortcut.key === "[" &&
        action("Next Search").props.shortcut.key === "]" &&
        action("Previous Search").props.shortcut.modifiers.join() === "cmd" &&
        action("Next Search").props.shortcut.modifiers.join() === "cmd",
      "search-history actions preserve callbacks and command-bracket shortcuts",
    );
    assert(
      action("Go to Parent Folder").props.shortcut ===
        api.Keyboard.Shortcut.Common.MoveUp &&
        action("Navigate into Folder").props.shortcut ===
          api.Keyboard.Shortcut.Common.MoveDown,
      "deferred folder actions retain their navigation shortcuts",
    );
    const copies = renderer!.root.findAllByType("action-copy");
    const copy = (title: string) =>
      copies.find((item) => item.props.title === title)!.props;
    assert(
      copy("Copy Name").shortcut === api.Keyboard.Shortcut.Common.CopyName &&
        copy("Copy Name").content === "bar499" &&
        copy("Copy File").shortcut === api.Keyboard.Shortcut.Common.Copy &&
        copy("Copy File").content.file === "/foo/bar499",
      "copy actions use Raycast shortcuts and preserve name versus file payloads",
    );
    assert(
      renderer!.root.findByType("action-openwith").props.path ===
        "/foo/bar499" &&
        renderer!.root.findByType("action-finder").props.path === "/foo/bar499",
      "Open With and Show in Finder follow the selected path",
    );
    for (const [type, modifiers, key] of [
      ["action-finder", "cmd", "return"],
      ["action-openwith", "cmd", "o"],
      ["action-trash", "ctrl", "x"],
    ]) {
      const props = renderer!.root.findByType(type).props;
      assert(
        props.shortcut?.modifiers.join() === modifiers &&
          props.shortcut?.key === key,
        `${type} registers the Raycast File Search shortcut`,
      );
    }
    assert(
      renderer!.root
        .findAllByType("metadata-label")
        .some(
          (item) =>
            item.props.title === "Path" && item.props.text === "/foo/bar499",
        ),
      "deferred details show the selected file",
    );
    isDirectory = false;
    await act(() => renderer!.update(rows()));
    checkPrimaryActions();
    handlers.onReturnToStart = undefined;
    await act(() => renderer!.update(rows()));
    assert(
      !renderer!.root
        .findAllByType("action")
        .some((item) => item.props.title === "Return to Start"),
      "the initial search screen does not offer a redundant reset action",
    );
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
