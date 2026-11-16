import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { before, after, test } from "node:test";
import React from "react";
import { act, create } from "react-test-renderer";

// Exercise real React state and Raycast's useForm/usePromise hooks, with only
// native UI, storage, and rendering boundaries replaced by deterministic fakes.
const require = createRequire(import.meta.url);
const Module = require("node:module");
const originalLoad = Module._load;
const pushed: React.ReactElement[] = [];
function component(name: string, members: string[] = []) {
  const result = Object.assign(
    (props: Record<string, unknown>) =>
      React.createElement(name, props, props.actions, props.searchBarAccessory, props.metadata, props.children),
    Object.fromEntries(members.map((key) => [key, component(`${name}.${key}`)])),
  );
  return result;
}
const Form = component("Form", [
  "TextArea",
  "TextField",
  "Description",
  "Separator",
  "FilePicker",
  "Checkbox",
  "DatePicker",
]);
Form.Dropdown = component("Form.Dropdown", ["Item"]);
const Detail = component("Detail");
Detail.Metadata = component("Detail.Metadata", ["Label", "Link", "Separator"]);
const Grid = component("Grid", ["Item", "EmptyView"]);
Grid.Dropdown = component("Grid.Dropdown", ["Item"]);
const api = {
  Form,
  Detail,
  Grid,
  List: component("List", ["EmptyView", "Item"]),
  Action: Object.assign(component("Action", ["SubmitForm", "Push", "CopyToClipboard", "ShowInFinder"]), {
    Style: { Destructive: "destructive" },
  }),
  ActionPanel: component("ActionPanel", ["Section", "Submenu"]),
  Icon: new Proxy({}, { get: (_, name) => name }),
  Keyboard: { Shortcut: { Common: {} } },
  Toast: { Style: { Success: "success", Failure: "failure" } },
  LaunchType: { Background: "background" },
  environment: { assetsPath: resolve("assets"), launchType: "user", commandMode: "view" },
  Clipboard: { readText: async () => undefined },
  useNavigation: () => ({ push: (element: React.ReactElement) => pushed.push(element), pop: () => undefined }),
  showToast: async () => ({ hide() {} }),
};
Module._load = function (name: string, ...args: unknown[]) {
  return name === "@raycast/api" ? api : originalLoad.call(this, name, ...args);
};
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const options = { surface: "web-timeline", theme: "light", width: 390, dpr: 2, expanded: false };
const report = { size: { width: 390, height: 200 }, length: { weighted: 4, limit: 280 }, text: {} };
const state = {
  saves: [] as (string | undefined)[],
  drafts: new Map(),
  listError: false,
  resolutionCalls: 0,
  variants: [] as { options: (typeof options)[]; resolve: (value: unknown[]) => void }[],
};
const mocks = {
  defaultOptions: () => ({ ...options }),
  lastOptions: async () => ({ ...options }),
  saveOptions: async () => undefined,
  settings: () => ({ autoClipboard: false, saveHistory: true }),
  cacheDirectory: () => "/tmp/xeet-ui-test-cache",
  exportDirectory: () => "/tmp/xeet-ui-test-export",
  surfaces: { "web-timeline": "Web Timeline" },
  saveDraft: async (post: unknown, options: unknown, id?: string) => {
    state.saves.push(id);
    id ??= `draft-${state.saves.length}`;
    state.drafts.set(id, { post, options });
    return { id };
  },
  listDrafts: async () => {
    if (state.listError) throw new Error("LocalStorage unavailable");
    return [];
  },
  loadDraft: async () => undefined,
  deleteDraft: async () => undefined,
  resolveInput: async () => {
    if (++state.resolutionCalls === 1) throw new Error("X temporarily unavailable");
    return { post: { text: "Resolved post" }, warnings: [] };
  },
  clearResolutionCache: async () => undefined,
  getEngine: () => ({ explain: () => report }),
  renderPost: async (post: unknown, options: unknown) => ({
    post,
    options,
    report,
    warnings: [],
    path: "/tmp/preview.png",
  }),
  renderVariants: (_post: unknown, options: (typeof options)[]) =>
    new Promise((resolve) => state.variants.push({ options, resolve })),
  renderContactSheet: async () => "/tmp/sheet.png",
};
Object.assign(globalThis, { __xeetUIMocks: mocks });
let ui: Record<string, React.ComponentType>;
before(async () => {
  const directory = await mkdtemp(join(tmpdir(), "xeet-ui-"));
  await build({
    stdin: {
      contents:
        'export { default as InputForm } from "./src/components/input-form"; export { default as PostPreview } from "./src/components/post-preview"; export { default as PostForm } from "./src/components/post-form"; export { default as SavedDrafts } from "./src/saved-drafts"; export { default as VariantGrid } from "./src/components/variant-grid";',
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: join(directory, "ui.cjs"),
    plugins: [
      {
        name: "boundaries",
        setup(build) {
          build.onResolve({ filter: /\/lib\/(settings|storage|renderer|resolver)$/ }, (args) => ({
            path: args.path,
            namespace: "mock",
          }));
          build.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
            contents: Object.keys(mocks)
              .map((key) => `export const ${key} = globalThis.__xeetUIMocks.${key};`)
              .join("\n"),
          }));
          build.onResolve({ filter: /^(react(?:\/.*)?|@raycast\/api|@raycast\/utils)$/ }, (args) => ({
            path: args.path === "@raycast/api" ? args.path : require.resolve(args.path),
            external: true,
          }));
        },
      },
    ],
  });
  ui = require(join(directory, "ui.cjs"));
  await rm(directory, { recursive: true, force: true });
});
after(() => {
  Module._load = originalLoad;
});

async function mount(Component: React.ComponentType, props = {}) {
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(React.createElement(Component, props));
  });
  return tree!;
}
function action(tree: ReturnType<typeof create>, title: string) {
  return tree.root.findAll(
    (node) => typeof node.type === "string" && node.props.title === title && String(node.type).startsWith("Action"),
  )[0];
}
async function unmount(tree: ReturnType<typeof create>) {
  await act(async () => tree.unmount());
}

test("resolution failures permit submitting the unchanged URL again", async () => {
  const tree = await mount(ui.InputForm);
  assert.equal(tree.root.findByType("Form").props.navigationTitle, undefined);
  const input = "https://x.com/jack/status/20";
  await act(async () => tree.root.findByType("Form.TextArea").props.onChange(input));
  await act(async () => action(tree, "Generate Preview").props.onSubmit({ input }));
  assert.equal(tree.root.findByType("Form.TextArea").props.error, undefined);
  assert.ok(
    tree.root.findAllByType("Form.Description").some((node) => node.props.text === "X temporarily unavailable"),
  );
  await act(async () => action(tree, "Generate Preview").props.onSubmit({ input }));
  assert.equal(state.resolutionCalls, 2);
  assert.equal(pushed.at(-1)?.props.preview.post.text, "Resolved post");
  await unmount(tree);
});

test("preview saves reuse their returned draft ID and pass it to Edit Post", async () => {
  const preview = await mocks.renderPost({ text: "Post" }, options);
  const tree = await mount(ui.PostPreview, { preview });
  await act(async () => action(tree, "Save Draft").props.onAction());
  await act(async () => action(tree, "Save Draft").props.onAction());
  assert.deepEqual(state.saves, [undefined, "draft-1"]);
  assert.equal(state.drafts.size, 1);
  await act(async () => action(tree, "Edit Post").props.onAction());
  assert.equal(pushed.at(-1)?.props.draftId, "draft-1");
  assert.equal(pushed.at(-1)?.props.navigationTitle, "Edit Post");
  await unmount(tree);
});

test("Saved Drafts distinguishes read failures and recovers through retry", async () => {
  state.listError = true;
  const tree = await mount(ui.SavedDrafts);
  assert.equal(tree.root.findByType("List.EmptyView").props.title, "Could Not Load Saved Drafts");
  assert.equal(tree.root.findByType("List.EmptyView").props.description, "LocalStorage unavailable");
  state.listError = false;
  await act(async () => action(tree, "Retry Loading Drafts").props.onAction());
  assert.equal(tree.root.findByType("List.EmptyView").props.title, "No Saved Drafts");
  await unmount(tree);
});

test("comparison hooks discard stale renders after changing dimensions", async () => {
  const tree = await mount(ui.VariantGrid, { post: { text: "Post" }, options });
  assert.equal(state.variants.length, 1);
  await act(async () => tree.root.findByType("Grid.Dropdown").props.onChange("width"));
  assert.equal(state.variants.length, 2);
  const preview = await mocks.renderPost({ text: "Post" }, options);
  await act(async () => state.variants[1].resolve([{ ...preview, path: "/tmp/current.png" }]));
  await act(async () => state.variants[0].resolve([{ ...preview, path: "/tmp/stale.png" }]));
  assert.equal(tree.root.findByType("Grid.Item").props.content.source, "/tmp/current.png");
  await unmount(tree);
});

test("both post actions validate fields, and valid saves preserve the existing ID", async () => {
  const tree = await mount(ui.PostForm, { draftId: "existing-draft" });
  assert.equal(tree.root.findByType("Form").props.navigationTitle, undefined);
  assert.equal(
    tree.root.findAllByType("Form.TextField").find((node) => node.props.id === "name")?.props.placeholder,
    "Your Name",
  );
  const values = Object.fromEntries(
    tree.root
      .findAll((node) => typeof node.type === "string" && node.props.id)
      .map((node) => [node.props.id, node.props.value]),
  );
  const before = state.saves.length;
  for (const title of ["Generate Preview", "Save Draft"]) {
    await act(async () => action(tree, title).props.onSubmit({ ...values, text: "Hello", likes: "-1" }));
    assert.equal(state.saves.length, before);
    assert.match(
      tree.root.findAllByType("Form.TextField").find((node) => node.props.id === "likes")?.props.error,
      /non-negative/,
    );
  }
  await act(async () =>
    tree.root
      .findAllByType("Form.TextField")
      .find((node) => node.props.id === "likes")!
      .props.onChange("42"),
  );
  await act(async () => action(tree, "Save Draft").props.onSubmit({ ...values, text: "Hello", likes: "42" }));
  assert.equal(state.saves.at(-1), "existing-draft");
  assert.equal(state.drafts.get("existing-draft").post.text, "Hello");
  await unmount(tree);
});
