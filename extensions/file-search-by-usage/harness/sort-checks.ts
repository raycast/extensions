import fs from "node:fs";
import { createRequire } from "node:module";
import { transformSync } from "esbuild";
import * as React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { SORT_MODES } from "../src/lib/types";
import { useEventHandles } from "../src/components/use-event-handles";
import { parseQuery } from "../src/lib/query";

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
  const start = source.indexOf("        <SearchOptions");
  const dropdown = source.slice(
    start,
    source.indexOf("        />", start) + "        />".length,
  );
  const code = transformSync(
    `return function SortControl({ searchText = "" }) { const event = useEventHandles(); ${state}
      const parsed = parseQuery(searchText, typeFilter);
      const queryController = { abort() {} };
      return (${dropdown}); }`,
    { loader: "tsx", jsxFactory: "React.createElement" },
  ).code;
  const List = {
    Dropdown: Object.assign(
      (props: { children?: React.ReactNode }) =>
        React.createElement("sort", props, props.children),
      { Item: "option", Section: "section" },
    ),
  };
  const optionsModule = {
    exports: {} as typeof import("../src/components/search-options"),
  };
  new Function(
    "require",
    "module",
    "exports",
    "React",
    transformSync(
      fs.readFileSync("src/components/search-options.tsx", "utf8"),
      { loader: "tsx", format: "cjs", jsxFactory: "React.createElement" },
    ).code,
  )(
    (id: string) =>
      id === "@raycast/api"
        ? {
            List,
            Icon: { BulletPoints: "list", Folder: "folder", Document: "file" },
          }
        : { SORT_MODES },
    optionsModule,
    optionsModule.exports,
    React,
  );
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
      "SearchOptions",
      "parseQuery",
      code,
    )(
      React,
      React.useState,
      utils.exports.useCachedState,
      List,
      SORT_MODES,
      useEventHandles,
      optionsModule.exports.SearchOptions,
      parseQuery,
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
      renderer!.root
        .findAllByType("option")
        .some((option) => option.props.value === "directory"),
      "the search dropdown includes a Directory filter alongside sorting",
    );
    assert(
      controls()[0].props.value === "usage",
      "sort defaults to Usage before the first selection",
    );
    const options = () => renderer!.root.findAllByType("option");
    assert(
      ["All Types", "Directory", "File"].every((title) =>
        options().some(
          (option) => option.props.title === title && option.props.icon,
        ),
      ),
      "all three type filters use Raycast icons",
    );
    await act(() => controls()[0].props.onChange("name"));
    const registeredValues = options().map((option) => option.props.value);
    await act(() => controls()[0].props.onChange("directory"));
    assert(
      registeredValues.includes(controls()[0].props.value),
      "changing type keeps the controlled selection in Raycast's registered menu items",
    );
    assert(
      controls()[0].props.value === "name" &&
        options().some((option) => option.props.title === "Directory · Name"),
      "changing type preserves the sort choice",
    );
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
      controls().every(
        (control) =>
          control.props.value === "name" &&
          control
            .findAllByType("option")
            .some((option) => option.props.title === "Directory · Name"),
      ),
      "entering a folder retains the selected sort mode",
    );
    await act(() => controls()[1].props.onChange("size"));
    assert(
      controls().every(
        (control) =>
          control.props.value === "size" &&
          control
            .findAllByType("option")
            .some((option) => option.props.title === "Directory · Size"),
      ),
      "changing sort inside a folder also updates the parent view",
    );
    let restored = true;
    for (const type of ["all", "directory", "file"])
      for (const mode of SORT_MODES) {
        await act(() => controls()[0].props.onChange(type));
        await act(() => controls()[0].props.onChange(mode.value));
        // A new module instance simulates another command run with only host storage retained.
        const Reopened = makeControl();
        await act(() => renderer!.update(React.createElement(Reopened)));
        const typeTitle = {
          all: "All Types",
          directory: "Directory",
          file: "File",
        }[type];
        restored &&=
          controls()[0].props.value === mode.value &&
          options().some(
            (option) => option.props.title === `${typeTitle} · ${mode.title}`,
          );
      }
    assert(
      restored,
      "every type and sort combination survives closing and reopening the command",
    );
    await act(() =>
      renderer!.update(React.createElement(Control, { searchText: "-d foo" })),
    );
    assert(
      options().some(
        (option) =>
          option.props.value === "size" &&
          option.props.title === "Directory · Size",
      ),
      "the collapsed dropdown reports the effective query override without changing the saved type",
    );
  } finally {
    if (renderer) await act(() => renderer!.unmount());
    globals.IS_REACT_ACT_ENVIRONMENT = previous;
  }
}
