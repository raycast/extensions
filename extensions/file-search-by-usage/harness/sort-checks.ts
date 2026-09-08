import fs from "node:fs";
import { createRequire } from "node:module";
import { transformSync } from "esbuild";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { SORT_MODES } from "../src/lib/types";
import { useEventHandles } from "../src/components/use-event-handles";

/** Run the browser's sort control with real React and a host-cache substitute. */
export async function sortChecks(assert: (ok: boolean, label: string) => void) {
  const stored = new Map<string, string>();
  const listeners = new Set<() => void>();
  class Cache {
    get = (key: string) => stored.get(key);
    set = (key: string, value: string) => {
      stored.set(key, value);
      for (const listener of listeners) listener();
    };
    subscribe = (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
  }
  const requireDependency = createRequire(`${process.cwd()}/package.json`);
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const state = source.slice(
    source.indexOf("  const [sortMode,"),
    source.indexOf("  const [showingDetail,"),
  );
  const start = source.indexOf("        <List.Dropdown");
  const dropdown = source.slice(
    start,
    source.indexOf("        </List.Dropdown>", start) +
      "        </List.Dropdown>".length,
  );
  const code = transformSync(
    `return function SortControl() { const event = useEventHandles(); ${state} return (${dropdown}); }`,
    { loader: "tsx", jsxFactory: "React.createElement" },
  ).code;
  const makeControl = () => {
    const utils = { exports: {} as typeof import("@raycast/utils") };
    new Function(
      "require",
      "module",
      "exports",
      fs.readFileSync("node_modules/@raycast/utils/dist/main.js", "utf8"),
    )(
      (id: string) =>
        id === "@raycast/api"
          ? { Cache, environment: {} }
          : requireDependency(id),
      utils,
      utils.exports,
    );
    return new Function(
      "React",
      "useState",
      "useCachedState",
      "List",
      "SORT_MODES",
      "useEventHandles",
      code,
    )(
      React,
      React.useState,
      utils.exports.useCachedState,
      {
        Dropdown: Object.assign(
          (props: { children?: React.ReactNode }) =>
            React.createElement("sort", props, props.children),
          { Item: "option" },
        ),
      },
      SORT_MODES,
      useEventHandles,
    ) as React.FunctionComponent;
  };
  const globals = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previous = globals.IS_REACT_ACT_ENVIRONMENT;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  try {
    const Control = makeControl();
    await act(() => {
      renderer = create(React.createElement(Control));
    });
    const controls = () => renderer!.root.findAllByType("sort");
    assert(
      controls()[0].props.value === "usage",
      "sort defaults to Usage before the first selection",
    );
    await act(() => controls()[0].props.onChange("name"));
    await act(() =>
      renderer!.update(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Control),
          React.createElement(Control),
        ),
      ),
    );
    assert(
      controls().every((control) => control.props.value === "name"),
      "entering a folder retains the selected sort mode",
    );
    await act(() => controls()[1].props.onChange("size"));
    assert(
      controls().every((control) => control.props.value === "size"),
      "changing sort inside a folder also updates the parent view",
    );
    let restored = true;
    for (const mode of SORT_MODES) {
      await act(() => controls()[0].props.onChange(mode.value));
      // A new module instance simulates another command run with only host storage retained.
      const Reopened = makeControl();
      await act(() => renderer!.update(React.createElement(Reopened)));
      restored &&= controls()[0].props.value === mode.value;
    }
    assert(
      restored,
      "all sort choices survive closing and reopening the command",
    );
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
