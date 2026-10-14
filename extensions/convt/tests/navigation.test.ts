import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Element = { type: any; props: any };

function nodes(value: any): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !value.props) return [];
  return [value, ...Object.values(value.props).flatMap(nodes)];
}

function harness(convert: (request: any, callbacks: any) => Promise<any[]>) {
  const slots: any[] = [];
  let cursor = 0;
  const effects: (() => void)[] = [];
  const stack: Element[] = [];
  const failures: unknown[] = [];
  let pops = 0;
  const jsx = (type: any, props: any) => ({ type, props });
  const component = (name: string, children: Record<string, any> = {}) => Object.assign(() => {}, children, { displayName: name });
  const Form = component("Form", {
    Description: "Description",
    FilePicker: "FilePicker",
    Dropdown: component("Dropdown", { Item: "DropdownItem", Section: "DropdownSection" }),
    TextField: "TextField",
  });
  const api = {
    Form,
    Action: component("Action", {
      SubmitForm: "SubmitForm",
      OpenInBrowser: "OpenInBrowser",
      Push: "Push",
      CopyToClipboard: "CopyToClipboard",
      ShowInFinder: "ShowInFinder",
      Open: "Open",
    }),
    ActionPanel: "ActionPanel",
    List: component("List", { Item: "ListItem", Section: "ListSection" }),
    Detail: "Detail",
    Icon: {},
    Color: {},
    Toast: { Style: { Success: "success", Failure: "failure" } },
    showToast: async () => {},
    useNavigation: () => ({
      push: (element: Element) => stack.push(element),
      pop: () => {
        stack.pop();
        pops++;
      },
    }),
  };
  const react = {
    useState: (initial: any) => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (value: any) => {
          slots[i] = typeof value === "function" ? value(slots[i]) : value;
        },
      ];
    },
    useRef: (initial: any) => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useEffect: (effect: () => void, dependencies: any[]) => {
      const i = cursor++;
      if (!(i in slots) || dependencies.some((value, j) => value !== slots[i][j])) effects.push(effect);
      slots[i] = dependencies;
    },
  };
  const source = readFileSync(new URL("../src/convt.tsx", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2023,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} as any };
  const mocks: Record<string, any> = {
    "@raycast/api": api,
    "@raycast/utils": {
      usePromise: () => ({ data: "fixture" }),
      showFailureToast: async (error: unknown) => failures.push(error),
    },
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "node:path": path,
    "./lib/preferences": {},
    "./lib/convt": {
      getTargets: async () => [{ id: "jpeg", name: "JPEG", category: "image", extensions: ["jpg"] }],
      validateOptions: () => {},
      convertFiles: (_binary: string, request: any, callbacks: any) => convert(request, callbacks),
    },
  };
  runInNewContext(outputText, {
    require: (name: string) => mocks[name],
    module,
    exports: module.exports,
    process: { platform: "win32" },
    AbortController,
  });
  // Discover the actual Converter through Command's element, without exporting private components.
  const element = module.exports.default();
  slots.length = 0;
  effects.length = 0;
  const files = ["/fixture/report.pdf"];
  const render = () => {
    cursor = 0;
    return element.type({ ...element.props, files, setFiles: () => {} });
  };
  const field = (tree: Element, id: string) => nodes(tree).find((node) => node.props.id === id)!;
  const action = (tree: Element, title: string) => nodes(tree).find((node) => node.props.title === title)!;
  return {
    render,
    effects,
    stack,
    failures,
    field,
    action,
    Form,
    get pops() {
      return pops;
    },
  };
}

test("conversion keeps the root form and pushes final results; both return actions pop", async () => {
  let finish!: (results: any[]) => void;
  let callbacks: any;
  const ui = harness(async (_request, options) => {
    callbacks = options;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  ui.render();
  ui.effects.splice(0).forEach((effect) => effect());
  await new Promise(setImmediate);
  let tree = ui.render();
  ui.field(tree, "outputDirectory").props.onChange(["/fixture/output"]);
  for (const [id, value] of Object.entries({ quality: "85", maxSize: "1000", pages: "1-3", dpi: "300" })) {
    ui.field(tree, id).props.onChange(value);
  }
  tree = ui.render();
  const pending = ui
    .action(tree, "Convert Files")
    .props.onSubmit({ target: "jpeg", outputDirectory: ["/fixture/output"], quality: "85" });
  tree = ui.render();
  assert.equal(tree.type, ui.Form);
  assert.equal(tree.props.isLoading, true);
  assert.equal(ui.stack.length, 0);
  callbacks.onProgress({ input: "/fixture/report.pdf", completed: 0, total: 1, fraction: 0.5 });
  assert.ok(nodes(ui.render()).some((node) => node.props.text?.includes("50%")));
  ui.action(tree, "Cancel Conversion").props.onAction();
  assert.equal(callbacks.signal.aborted, true);
  finish([
    { status: "done", input: "/fixture/report.pdf", outputs: ["/fixture/output/report.jpg"] },
    { status: "cancelled", input: "/fixture/other.pdf", message: "Cancelled" },
  ]);
  await pending;
  assert.equal(ui.stack.length, 1);
  const pushed = ui.stack[0];
  const results = pushed.type(pushed.props);
  ui.action(results, "Convert More Files").props.onAction();
  assert.equal(ui.pops, 1);
  tree = ui.render();
  assert.equal(tree.type, ui.Form);
  assert.equal(tree.props.isLoading, false);
  assert.deepEqual(ui.field(tree, "outputDirectory").props.value, ["/fixture/output"]);
  for (const [id, value] of Object.entries({ quality: "85", maxSize: "1000", pages: "1-3", dpi: "300" })) {
    assert.equal(ui.field(tree, id).props.value, value);
  }
  ui.stack.push(pushed);
  ui.action(results, "Back to Conversion").props.onAction();
  assert.equal(ui.pops, 2);
});

test("a rejected conversion keeps the form and does not push results", async () => {
  const error = new Error("Choose an existing output folder.");
  const ui = harness(async () => {
    throw error;
  });
  ui.render();
  ui.effects.splice(0).forEach((effect) => effect());
  await new Promise(setImmediate);
  await ui
    .action(ui.render(), "Convert Files")
    .props.onSubmit({ target: "jpeg", outputDirectory: ["/fixture/missing"] });
  assert.equal(ui.render().type, ui.Form);
  assert.equal(ui.render().props.isLoading, false);
  assert.equal(ui.stack.length, 0);
  assert.equal(ui.failures[0], error);
});
