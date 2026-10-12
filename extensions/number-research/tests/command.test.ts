import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import ts from "typescript";
import { useDiscovery } from "../src/use-discovery.ts";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const require = createRequire(import.meta.url);
const noun = "number";
const initial = "123";
const next = "456";
const invalid = "letters";

function native(name: string) {
  return (props: { children?: ReactNode; actions?: ReactNode; metadata?: ReactNode }) =>
    createElement("div", { ...props, "data-raycast-type": name }, props.children, props.actions, props.metadata);
}

// Render the actual TSX command with native Raycast components represented by
// host elements. Only the API boundary is synthetic; hooks and handlers are real.
async function mount() {
  const calls: { input: string; signal: AbortSignal }[] = [];
  const api = {
    checkNumber: async (input: string, signal: AbortSignal) => {
      calls.push({ input, signal });
      return { number: input, is_new: false, search_count: 1, discovered_at: "2026-03-19" };
    },
    formatDate: (value: string) => value,
  };
  const raycast = {
    Action: Object.assign(native("Action"), {
      SubmitForm: native("SubmitForm"),
      OpenInBrowser: native("OpenInBrowser"),
      CopyToClipboard: native("CopyToClipboard"),
    }),
    ActionPanel: Object.assign(native("ActionPanel"), { Section: native("Section") }),
    Detail: Object.assign(native("Detail"), {
      Metadata: Object.assign(native("Metadata"), {
        Label: native("Label"),
        Link: native("Link"),
        Separator: native("Separator"),
        TagList: Object.assign(native("TagList"), { Item: native("TagItem") }),
      }),
    }),
    Form: Object.assign(native("Form"), { TextField: native("TextField") }),
    Color: { Green: "green", Blue: "blue" },
  };
  const source = readFileSync(new URL(`../src/discover-${noun}.tsx`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module: { exports: { default?: (props: { arguments: Record<string, string> }) => ReactNode } } = {
    exports: {},
  };
  const load = (name: string) => {
    if (name === "@raycast/api") return raycast;
    if (name === "./api") return api;
    if (name === "./use-discovery") return { useDiscovery };
    return require(name);
  };
  new Function("require", "module", "exports", compiled.outputText)(load, module, module.exports);
  const Command = module.exports.default;
  assert.ok(Command);
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(Command, { arguments: { [noun]: initial } }));
  });
  return {
    renderer,
    calls,
    async unmount() {
      await act(async () => {
        renderer.unmount();
      });
    },
  };
}

function callback(renderer: ReactTestRenderer, type: string, prop: string, title?: string) {
  const node = renderer.root
    .findAll((node) => node.props["data-raycast-type"] === type)
    .find((node) => !title || node.props.title === title);
  assert.ok(node, `${type} ${title ?? ""} is rendered`);
  const value: unknown = node.props[prop];
  assert.equal(typeof value, "function");
  if (typeof value !== "function") assert.fail("Missing callback");
  return value;
}

async function openForm(renderer: ReactTestRenderer) {
  await act(async () => {
    callback(renderer, "Action", "onAction", "Discover Another Number")();
  });
  assert.equal(renderer.root.findAll((node) => node.props["data-raycast-type"] === "Form").length, 1);
}

async function submit(renderer: ReactTestRenderer, value: string) {
  await act(async () => {
    callback(renderer, "TextField", "onChange")(value);
  });
  await act(async () => {
    callback(renderer, "SubmitForm", "onSubmit")({ input: value });
  });
}

test("the command opens the repeat form, rejects invalid input, and discovers a new value", async () => {
  const view = await mount();
  try {
    assert.deepEqual(
      view.calls.map((call) => call.input),
      [initial],
    );
    await openForm(view.renderer);
    assert.equal(view.calls[0].signal.aborted, true);
    await submit(view.renderer, invalid);
    assert.equal(view.calls.length, 1);
    assert.equal(view.renderer.root.findAll((node) => node.props["data-raycast-type"] === "Form").length, 1);
    assert.equal(
      typeof view.renderer.root.find((node) => node.props["data-raycast-type"] === "TextField").props.error,
      "string",
    );
    await submit(view.renderer, ` ${next} `);
    assert.deepEqual(
      view.calls.map((call) => call.input),
      [initial, next],
    );
    assert.equal(view.renderer.root.findAll((node) => node.props["data-raycast-type"] === "Form").length, 0);
    assert.match(
      view.renderer.root.find((node) => node.props["data-raycast-type"] === "Detail").props.markdown,
      new RegExp(next),
    );
  } finally {
    await view.unmount();
  }
});

test("submitting the same value checks again and unmount cleans up the new request", async () => {
  const view = await mount();
  await openForm(view.renderer);
  await submit(view.renderer, initial);
  assert.deepEqual(
    view.calls.map((call) => call.input),
    [initial, initial],
  );
  await view.unmount();
  assert.equal(view.calls[1].signal.aborted, true);
});
