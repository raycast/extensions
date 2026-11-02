import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { FileInspection, Format } from "../src/lib/convt";

type Element = { type: any; props: any };

function nodes(value: any): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !value.props) return [];
  return [value, ...Object.values(value.props).flatMap(nodes)];
}

const formats: Record<string, Format> = {
  pdf: { id: "pdf", name: "PDF", category: "document", extensions: ["pdf"] },
  png: { id: "png", name: "PNG", category: "image", extensions: ["png"] },
  jpeg: { id: "jpeg", name: "JPEG", category: "image", extensions: ["jpg", "jpeg"] },
  avif: { id: "avif", name: "AVIF", category: "image", extensions: ["avif"] },
  webp: { id: "webp", name: "WebP", category: "image", extensions: ["webp"] },
  mov: { id: "mov", name: "MOV", category: "video", extensions: ["mov"] },
  mp4: { id: "mp4", name: "MP4", category: "video", extensions: ["mp4"] },
};

function inspection(files: string[], targetIds = ["jpeg"], suggestedTargetIds = ["jpeg"]): FileInspection {
  return {
    sources: files.map((file) => {
      const extension = path.extname(file).slice(1).toLowerCase();
      return { file, extension, format: formats[extension] ?? null };
    }),
    targets: targetIds.map((id) => formats[id]),
    suggestedTargetIds,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function harness(
  convert: (request: any, callbacks: any) => Promise<any[]>,
  inspect: (files: string[], signal: AbortSignal) => Promise<FileInspection> = async (files) => inspection(files),
) {
  const slots: any[] = [];
  let cursor = 0;
  const effects: (() => void)[] = [];
  const cleanups = new Map<number, () => void>();
  const stack: Element[] = [];
  const failures: unknown[] = [];
  let pops = 0;
  const jsx = (type: any, props: any) => ({ type, props });
  const component = (name: string, children: Record<string, any> = {}) =>
    Object.assign(() => {}, children, { displayName: name });
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
    useEffect: (effect: () => void | (() => void), dependencies: any[]) => {
      const i = cursor++;
      if (!(i in slots) || dependencies.some((value, j) => value !== slots[i][j])) {
        effects.push(() => {
          cleanups.get(i)?.();
          const cleanup = effect();
          if (cleanup) cleanups.set(i, cleanup);
          else cleanups.delete(i);
        });
      }
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
      inspectFiles: (_binary: string, files: string[], signal: AbortSignal) => inspect(files, signal),
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
  let files = ["/fixture/report.pdf"];
  const setFiles = (next: string[]) => {
    files = next;
  };
  const render = () => {
    cursor = 0;
    return element.type({ ...element.props, files, setFiles });
  };
  const field = (tree: Element, id: string) => nodes(tree).find((node) => node.props.id === id)!;
  const action = (tree: Element, title: string) => nodes(tree).find((node) => node.props.title === title)!;
  return {
    render,
    setFiles,
    unmount: () => cleanups.forEach((cleanup) => cleanup()),
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

test("shows detected types before suggested outputs without duplicate dropdown values", async () => {
  const ui = harness(
    async () => [],
    async (files) => inspection(files, ["avif", "jpeg", "webp"], ["webp", "jpeg"]),
  );
  ui.setFiles(["/fixture/one.PNG", "/fixture/two.png", "/fixture/report.pdf"]);
  ui.render();
  ui.effects.splice(0).forEach((effect) => effect());
  await new Promise(setImmediate);
  const tree = ui.render();
  const all = nodes(tree);
  const source = ui.action(tree, "Detected File Types");
  assert.match(source.props.text, /PNG image · 2 files; PDF document · 1 file\. Based on file extensions/);
  assert.ok(all.indexOf(source) < all.indexOf(ui.field(tree, "target")));
  const dropdown = ui.field(tree, "target");
  assert.equal(dropdown.props.value, "webp");
  assert.deepEqual(
    nodes(dropdown)
      .filter((node) => node.type === "DropdownSection")
      .map((node) => node.props.title),
    ["Suggested", "Image"],
  );
  assert.deepEqual(
    nodes(dropdown)
      .filter((node) => node.type === "DropdownItem")
      .map((node) => node.props.value),
    ["webp", "jpeg", "avif"],
  );
});

test("outputs remain available when Convt has no shared suggestions", async () => {
  const ui = harness(
    async () => [],
    async (files) => inspection(files, ["jpeg", "webp"], []),
  );
  ui.render();
  ui.effects.splice(0).forEach((effect) => effect());
  await new Promise(setImmediate);
  const dropdown = ui.field(ui.render(), "target");
  assert.equal(dropdown.props.value, "jpeg");
  assert.deepEqual(
    nodes(dropdown)
      .filter((node) => node.type === "DropdownSection")
      .map((node) => node.props.title),
    ["Image"],
  );
  assert.equal(nodes(dropdown).filter((node) => node.type === "DropdownItem").length, 2);
});

test("automatic defaults follow new suggestions while supported manual choices persist", async () => {
  const ui = harness(
    async () => [],
    async (files) =>
      files[0].endsWith(".png")
        ? inspection(files, ["avif", "jpeg", "webp"], ["webp", "jpeg"])
        : inspection(files, ["jpeg", "webp"], ["jpeg"]),
  );
  const settle = async (files: string[], retainedTarget = "") => {
    ui.setFiles(files);
    const loading = ui.render();
    const placeholder = nodes(ui.field(loading, "target")).find((node) => node.type === "DropdownItem")!;
    assert.equal(placeholder.props.title, "Finding available formats…");
    assert.equal(placeholder.props.value, retainedTarget);
    assert.equal(ui.field(loading, "target").props.value, retainedTarget);
    ui.field(loading, "target").props.onChange("jpeg");
    ui.effects.splice(0).forEach((effect) => effect());
    await new Promise(setImmediate);
    const dropdown = ui.field(ui.render(), "target");
    const items = nodes(dropdown).filter((node) => node.type === "DropdownItem");
    const nativeSelection = items.find((item) => item.props.value === placeholder.props.value) ?? items[0];
    dropdown.props.onChange(nativeSelection.props.value);
    return ui.render();
  };
  let tree = await settle(["/fixture/one.png"]);
  assert.equal(ui.field(tree, "target").props.value, "webp");
  ui.field(tree, "target").props.onChange("webp");
  tree = await settle(["/fixture/report.pdf"]);
  assert.equal(ui.field(tree, "target").props.value, "jpeg");
  ui.field(tree, "target").props.onChange("webp");
  tree = await settle(["/fixture/two.pdf"], "webp");
  assert.equal(ui.field(tree, "target").props.value, "webp");
  tree = await settle(["/fixture/two.png"], "webp");
  ui.field(tree, "target").props.onChange("avif");
  tree = await settle(["/fixture/three.pdf"], "avif");
  assert.equal(ui.field(tree, "target").props.value, "jpeg");
  tree = await settle(["/fixture/three.png"]);
  assert.equal(ui.field(tree, "target").props.value, "webp");
});

test("file changes abort discovery and ignore stale successes and errors", async () => {
  const requests: { files: string[]; signal: AbortSignal; pending: ReturnType<typeof deferred<FileInspection>> }[] = [];
  const ui = harness(
    async () => [],
    (files, signal) => {
      const pending = deferred<FileInspection>();
      requests.push({ files, signal, pending });
      return pending.promise;
    },
  );
  ui.render();
  ui.effects.splice(0).forEach((effect) => effect());
  ui.setFiles(["/fixture/one.png"]);
  let tree = ui.render();
  assert.equal(tree.props.isLoading, true);
  assert.equal(ui.field(tree, "target").props.value, "");
  ui.effects.splice(0).forEach((effect) => effect());
  assert.equal(requests[0].signal.aborted, true);
  requests[0].pending.resolve(inspection(requests[0].files));
  await new Promise(setImmediate);
  tree = ui.render();
  assert.equal(tree.props.isLoading, true);
  assert.equal(ui.field(tree, "target").props.value, "");
  ui.setFiles(["/fixture/clip.mov"]);
  ui.render();
  ui.effects.splice(0).forEach((effect) => effect());
  assert.equal(requests[1].signal.aborted, true);
  requests[2].pending.resolve(inspection(requests[2].files, ["mp4"], ["mp4"]));
  await new Promise(setImmediate);
  requests[1].pending.reject(new Error("Stale failure"));
  await new Promise(setImmediate);
  tree = ui.render();
  assert.equal(tree.props.isLoading, false);
  assert.equal(ui.field(tree, "target").props.value, "mp4");
  assert.equal(ui.field(tree, "files").props.error, undefined);
  assert.match(ui.action(tree, "Detected File Types").props.text, /MOV video/);
  ui.unmount();
  assert.equal(requests[2].signal.aborted, true);
});

test("unknown files, no common outputs, and an empty selection have distinct states", async () => {
  const ui = harness(
    async () => [],
    async (files) => inspection(files, [], []),
  );
  ui.setFiles(["/fixture/one.xyz", "/fixture/README"]);
  ui.render();
  ui.effects.splice(0).forEach((effect) => effect());
  await new Promise(setImmediate);
  let tree = ui.render();
  assert.match(ui.action(tree, "Detected File Types").props.text, /Unknown \(\.xyz\).*; No file extension/);
  assert.match(ui.field(tree, "files").props.error, /does not recognize/);
  assert.equal(
    nodes(ui.field(tree, "target")).find((node) => node.type === "DropdownItem")?.props.title,
    "No available formats",
  );
  ui.setFiles(["/fixture/report.pdf"]);
  tree = ui.render();
  assert.equal(ui.field(tree, "files").props.error, undefined);
  ui.effects.splice(0).forEach((effect) => effect());
  await new Promise(setImmediate);
  tree = ui.render();
  assert.match(ui.field(tree, "files").props.error, /No shared output format/);
  ui.setFiles([]);
  tree = ui.render();
  assert.equal(tree.props.isLoading, false);
  assert.equal(ui.field(tree, "files").props.error, undefined);
  assert.equal(
    nodes(ui.field(tree, "target")).find((node) => node.type === "DropdownItem")?.props.title,
    "Choose files first",
  );
});
