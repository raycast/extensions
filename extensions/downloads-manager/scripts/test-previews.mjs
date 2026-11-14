import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const directory = mkdtempSync(join(tmpdir(), "downloads-preview-test-"));
const component = (name) => Object.assign(() => null, { displayName: name });
const Detail = component("Detail");
Detail.Metadata = component("Metadata");
Detail.Metadata.Label = component("Label");
Detail.Metadata.Separator = component("Separator");
const List = component("List");
List.Item = component("List.Item");
List.Item.Detail = Detail;
List.EmptyView = component("List.EmptyView");
const Grid = component("Grid");
Grid.Item = component("Grid.Item");
Grid.EmptyView = component("Grid.EmptyView");
const ActionPanel = component("ActionPanel");
ActionPanel.Section = component("Section");
const Action = new Proxy(component("Action"), { get: (_, name) => name });

function descendants(element) {
  if (!element || typeof element !== "object") return [];
  const children = [element.props?.children].flat(Infinity);
  return [element, ...children.flatMap(descendants)];
}

const { outputFiles } = await build({
  entryPoints: ["src/manage-downloads.tsx"],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  external: ["@raycast/api", "@raycast/utils", "react", "react/jsx-runtime"],
});

function render(file, { preview = true, showingDetail = true, layout = "list", selected = true } = {}) {
  const path = join(directory, file);
  const download = {
    file,
    path,
    size: 20,
    isDirectory: false,
    lastModifiedAt: new Date(0),
    createdAt: new Date(0),
    addedAt: new Date(0),
    birthAt: new Date(0),
  };
  const state = [[download], false, false, 0, selected ? path : null];
  const preferences = { downloadsFolder: directory, showPreview: preview };
  const api = {
    Action,
    ActionPanel,
    List,
    Grid,
    Icon: new Proxy({}, { get: (_, name) => name }),
    Keyboard: { Shortcut: { Common: {} } },
    Cache: class {
      get() {}
      set() {}
    },
    getPreferenceValues: () => preferences,
  };
  const utils = {
    useCachedState: (key) => [key === "downloadsLayout" ? layout : showingDetail, () => {}],
    usePromise: () => ({ data: "data:image/png;base64,thumbnail", isLoading: false }),
  };
  const react = {
    useState: () => [state.shift(), () => {}],
    useRef: () => ({ current: null }),
    useCallback: (callback) => callback,
    useEffect: () => {},
  };
  const module = { exports: {} };
  vm.runInNewContext(outputFiles[0].text, {
    module,
    exports: module.exports,
    process,
    Buffer,
    console,
    setTimeout,
    clearTimeout,
    require: (name) => {
      if (name === "@raycast/api") return api;
      if (name === "@raycast/utils") return utils;
      if (name === "react") return react;
      return require(name);
    },
  });
  const wrapped = module.exports.default({});
  const tree = wrapped.type(wrapped.props);
  const item = descendants(tree).find((node) => node.type === (layout === "grid" ? Grid.Item : List.Item));
  const detail = item.props.detail;
  return { item, detail: detail ? detail.type(detail.props) : null, path };
}

try {
  writeFileSync(join(directory, "notes.md"), "Local preview fixture");
  const image = render("photo.png");
  assert.equal(image.detail.props.markdown, null, "non-text files must not render inline base64 thumbnails");
  assert.ok(image.detail.props.metadata, "image metadata remains available");
  const text = render("notes.md");
  assert.match(text.detail.props.markdown, /Local preview fixture/, "text previews remain readable");
  assert.equal(render("notes.md", { preview: false }).detail.props.markdown, null);
  assert.equal(render(".hidden.md").detail.props.markdown, null);
  assert.equal(
    render("photo.png", { showingDetail: false }).item.props.detail,
    undefined,
    "hidden detail must not mount previews",
  );
  assert.equal(
    render("photo.png", { selected: false }).item.props.detail,
    undefined,
    "unselected rows must not mount previews",
  );
  for (const layout of ["list", "grid"]) {
    const { item, path } = render("photo.png", { layout });
    assert.equal(item.props.quickLook.path, path);
    assert.equal(item.props.quickLook.name, "photo.png");
    const actions = descendants(item.props.actions);
    assert.ok(
      actions.some((node) => node.type === "ToggleQuickLook"),
      `${layout} retains native Quick Look`,
    );
    for (const name of ["CopyToClipboard", "Paste"]) {
      assert.ok(
        actions.some((node) => node.type === name && node.props.content?.file === path),
        `${layout} retains ${name} file paths`,
      );
    }
  }
  assert.doesNotMatch(readFileSync("src/manage-downloads.tsx", "utf8"), /getQuickLookPreviewDataUrl|\.\/quicklook/);
  console.log("PASS: text previews and metadata remain; custom image previews are absent");
  console.log("PASS: list and grid retain native Quick Look, file copy, and paste");
  console.log("PASS: hidden details and unselected rows do not mount preview components");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
