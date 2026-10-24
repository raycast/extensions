const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Raycast's native runtime is unavailable in Node; keep the production modules and stub only their imports.
function loadSource(file, dependencies, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      assert.ok(name in dependencies, `Missing test dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return exports;
}

test("workspace discovery persists the resolved pair and generation stays in its original workspace", async () => {
  const workspace = { id: "org-a", slug: "workspace-a", name: "A", logo: null, isCurrent: true };
  const keys = loadSource("constants/workspace.ts", {});
  const selected = loadSource("lib/selected-workspace.ts", {});
  const workspaceUtils = loadSource("utils/workspace.ts", { "../constants/workspace": keys });
  const storage = new Map();
  const writes = [];
  const effects = [];
  let response = { workspaces: [workspace] };
  let storageLoading = false;
  const { useWorkspace } = loadSource("hooks/use-workspace.ts", {
    "@raycast/utils": {
      useFetch: () => ({ data: response, isLoading: false }),
      useLocalStorage: (key) => ({
        value: storage.get(key),
        isLoading: storageLoading,
        setValue: async (value) => {
          writes.push([key, value]);
          storage.set(key, value);
        },
      }),
      showFailureToast: (error) => assert.fail(error),
    },
    react: { useEffect: (effect) => effects.push(effect) },
    "../constants/workspace": keys,
    "../lib/notra": { NOTRA_API_URL: "https://api.usenotra.com", getNotraRequestInit: () => ({}) },
    "../lib/selected-workspace": selected,
    "../utils/workspace": workspaceUtils,
  });
  function discover() {
    const result = useWorkspace();
    effects.splice(0).forEach((effect) => effect());
    return result;
  }

  storageLoading = true;
  assert.equal(discover().isLoading, true);
  assert.equal(writes.length, 0);
  storageLoading = false;
  discover();
  assert.equal(storage.get(keys.SELECTED_ORGANIZATION_STORAGE_KEY), workspace.id);
  assert.equal(storage.get(keys.SELECTED_ORGANIZATION_SLUG_STORAGE_KEY), workspace.slug);
  discover();
  assert.equal(writes.length, 2, "unchanged discovery must not write again");
  storage.set(keys.SELECTED_ORGANIZATION_SLUG_STORAGE_KEY, "old-slug");
  discover();
  assert.equal(storage.get(keys.SELECTED_ORGANIZATION_SLUG_STORAGE_KEY), workspace.slug);
  response = undefined;
  const fallback = discover().workspace;
  assert.equal(fallback.id, workspace.id);
  assert.equal(fallback.slug, workspace.slug);
  assert.equal(writes.length, 4, "fallback must not rewrite discovery storage");

  const requests = [];
  const component = new Proxy(() => {}, { get: () => component });
  const pushed = [];
  const api = {
    Action: component,
    ActionPanel: component,
    Color: component,
    Detail: component,
    Icon: component,
    getPreferenceValues: () => ({ apiKey: "test-key" }),
    Cache: class {
      get() {}
    },
    useNavigation: () => ({ push: (view) => pushed.push(view) }),
  };
  const utils = loadSource("utils/index.ts", { "@raycast/api": api, "../lib/selected-workspace": selected });
  const notra = loadSource(
    "lib/notra.ts",
    {
      "@raycast/api": api,
      "../utils": utils,
      "../utils/workspace": workspaceUtils,
      "./selected-workspace": selected,
    },
    {
      fetch: async (url, init) => {
        requests.push({ url, init });
        return {
          ok: true,
          json: async () => ({ job: { status: "completed", postId: "result", brandIdentityId: "result" }, events: [] }),
        };
      },
    },
  );
  selected.setSelectedWorkspace({ id: "org-b", slug: "workspace-b" });
  const stateValues = ["completed", [], null, "result", false];
  let stateIndex = 0;
  const { GenerationStatus } = loadSource(
    "components/generation-status.tsx",
    {
      "@raycast/api": api,
      "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
      react: {
        useEffect: (effect) => effects.push(effect),
        useRef: (current) => ({ current }),
        useState: () => [stateValues[stateIndex++], () => {}],
      },
      "../lib/notra": notra,
      "../utils": utils,
      "./brand-identity-detail": { BrandIdentityDetail: component },
    },
    { setTimeout, clearTimeout },
  );

  for (const type of ["post", "brand-identity"]) {
    stateIndex = 0;
    const view = GenerationStatus({ type, jobId: "job-a", organization: workspace });
    const actions = view.props.actions.props.children;
    const link = actions.find((action) => action && action.props.url);
    assert.ok(link.props.url.startsWith("https://app.usenotra.com/workspace-a/"));
    effects.splice(0).forEach((effect) => effect());
    await new Promise(setImmediate);
    assert.equal(requests.at(-1).init.headers[keys.ORGANIZATION_HEADER], workspace.id);
  }
  assert.equal(pushed[0].props.organization.id, workspace.id, "generated brand detail must retain the job's workspace");
});
