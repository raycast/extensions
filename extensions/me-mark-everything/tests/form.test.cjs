const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const jsx = require("react/jsx-runtime");

// Render the actual creation container with native controls and reads stubbed.
// Exercises row identities, submission callbacks and prefill effects, not native UI.
function fixture() {
  const slots = [];
  let cursor = 0,
    effects = [];
  const toast = [],
    navigation = [],
    prepared = [];
  let lookup = {},
    submitError;
  let formOptions,
    stored = { note: "", collection: "-1", tags: [] },
    optionData = { entities: [], libraryId: "L" };
  class Failure extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
  class SaveInputError extends Failure {
    constructor(fields, hits) {
      super("INVALID", "Review marked URLs");
      this.fields = fields;
      this.hits = hits;
    }
  }
  const prefillCode = ts.transpileModule(fs.readFileSync("src/helpers/prefill.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const prefillModule = { exports: {} };
  vm.runInNewContext(prefillCode, { module: prefillModule, exports: prefillModule.exports });
  const react = {
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = value;
      return [
        slots[i],
        (next) => {
          slots[i] = typeof next === "function" ? next(slots[i]) : next;
        },
      ];
    },
    useRef(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: value };
      return slots[i];
    },
    useMemo(fn) {
      return fn();
    },
    useEffect(fn) {
      effects.push(fn);
    },
  };
  const Form = Object.assign(function () {}, { TextField: "TextField", Description: "Description" });
  const Action = Object.assign(function () {}, { SubmitForm: "SubmitForm" });
  const ActionPanel = Object.assign(function () {}, { Submenu: "Submenu" });
  const mocks = {
    react,
    "react/jsx-runtime": jsx,
    "@raycast/api": {
      Form,
      Action,
      ActionPanel,
      Icon: {},
      showToast: async (item) => toast.push(item),
      Toast: { Style: { Failure: "failed" } },
      useNavigation: () => ({ push: (item) => navigation.push(item) }),
    },
    "@raycast/utils": {
      useForm: (options) => {
        formOptions = options;
        return {
          itemProps: Object.fromEntries(Object.entries(stored).map(([id, value]) => [id, { id, value }])),
          handleSubmit: (values) => options.onSubmit(values),
          reset: () => {
            stored = { note: "", collection: "-1", tags: [] };
          },
        };
      },
    },
    "../helpers/collections": { buildCollectionsOptions: () => [] },
    "../helpers/duplicates": { canonicalUrl: (value) => value },
    "../helpers/edit": { tagChoices: () => ({ items: [] }), usable: () => true },
    "../helpers/me": { toCollections: () => ({}) },
    "../helpers/prefill": prefillModule.exports,
    "../helpers/save": {
      MAX_URLS: 10,
      prepareNewBookmarks: async (values) => {
        if (submitError) throw submitError;
        prepared.push(values);
        return values;
      },
      SaveInputError,
    },
    "../helpers/url": { inputUrl: (value) => value },
    "../hooks/useCollections": { useCollections: () => optionData },
    "../hooks/useTags": { useTags: () => optionData },
    "../hooks/useSavedLookup": { useSavedLookup: () => ({ ...lookup, reload() {} }) },
    "../hooks/useSubmission": {
      useSubmission: () => ({
        ready: true,
        busy: false,
        controller: {
          start: async (_, prepare) => {
            try {
              await prepare();
              return { kind: "no-change" };
            } catch (error) {
              return { kind: "rejected", error };
            }
          },
        },
      }),
    },
    "../ui": {},
    "../session": { session: async () => ({ libraryId: "L" }) },
    "../helper": { Failure },
    "../shortcut-settings": { getShortcuts: () => ({}) },
    "./AlreadySaved": { default: "AlreadySaved" },
    "./BookmarkFields": { BookmarkFields: "BookmarkFields" },
    "./SubmissionActions": { showOutcome: async () => {} },
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync("src/components/BookmarkForm.tsx", "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => {
      if (!(name in mocks)) throw Error(name);
      return mocks[name];
    },
    Error,
  });
  const render = (props = {}) => {
    cursor = 0;
    effects = [];
    const tree = module.exports.BookmarkForm(props);
    const pending = effects;
    effects = [];
    for (const effect of pending) effect();
    return tree;
  };
  return {
    render,
    toast,
    navigation,
    prepared,
    setLookup: (value) => {
      lookup = value;
    },
    setSubmitError: (fields, hits) => {
      submitError = new SaveInputError(fields, hits);
    },
    setStored: (value) => {
      stored = { ...stored, ...value };
    },
    failOptions: () => {
      optionData = { error: Error("unavailable"), libraryId: "L" };
    },
    submit: (values) => formOptions.onSubmit(values),
  };
}
function walk(node, predicate) {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap((item) => walk(item, predicate));
  if (typeof node !== "object") return [];
  return [
    ...(predicate(node) ? [node] : []),
    ...walk(node.props?.children, predicate),
    ...walk(node.props?.actions, predicate),
    ...walk(node.props?.identity, predicate),
  ];
}
const action = (tree, title) => walk(tree, (node) => node.props?.title === title)[0];
const rows = (tree) => walk(tree, (node) => node.props?.row && typeof node.props.index === "number");
test("creation has at most ten independent URL/title rows; removal preserves each remaining pair", async () => {
  const f = fixture();
  let tree = f.render();
  for (let i = 0; i < 10; i++) {
    const row = rows(tree)[i];
    assert.ok(row);
    row.props.onChange({ url: `https://example.org/${i}`, title: `Title ${i}` });
    tree = f.render();
    if (i < 9) {
      await action(tree, "Add Another URL").props.onAction();
      tree = f.render();
    }
  }
  await action(tree, "Add Another URL").props.onAction();
  tree = f.render();
  assert.equal(rows(tree).length, 10);
  assert.equal(f.toast.at(-1).title, "Maximum 10 URLs");
  for (const [index, row] of rows(tree).entries()) {
    const fields = row.type(row.props);
    assert.equal(
      walk(fields, (node) => node.type === "TextField")[0].props.id,
      index ? `url${index}` : "url",
    );
  }
  action(tree, "URL 5").props.onAction();
  tree = f.render();
  assert.equal(rows(tree).length, 9);
  assert.deepEqual(
    rows(tree).map((row) => [row.props.row.url, row.props.row.title]),
    [0, 1, 2, 3, 5, 6, 7, 8, 9].map((i) => [`https://example.org/${i}`, `Title ${i}`]),
  );
  const first = rows(tree)[0].props.row;
  f.setLookup({ lookup: { hits: [{ link: first.url, entity: { id: "existing" } }] } });
  tree = f.render();
  assert.match(rows(tree)[0].props.error, /Already saved/);
  assert.equal(rows(tree).length, 9);
  assert.equal(f.navigation.length, 0);
  assert.ok(action(tree, "View Existing Bookmarks"));
});

test("a submit-time duplicate keeps its view action even after a background no-match", async () => {
  const f = fixture();
  let tree = f.render();
  rows(tree)[0].props.onChange({ url: "https://example.org/late", title: "My title" });
  f.setLookup({ lookup: { hits: [] } });
  tree = f.render();
  f.setSubmitError({ 0: "Already saved" }, [
    { link: "https://example.org/late", entity: { id: "existing" } },
  ]);
  await f.submit({ note: "Keep my note", tags: [], collection: "-1" });
  tree = f.render();
  assert.match(rows(tree)[0].props.error, /Already saved/);
  assert.ok(action(tree, "View Existing Bookmarks"));
  assert.equal(rows(tree)[0].props.row.title, "My title");
  assert.equal(f.prepared.length, 0);
  assert.equal(f.navigation.length, 0);
});
test("an unavailable picker must not silently replace a selected collection or tags with defaults", async () => {
  for (const stored of [{ collection: "selected-collection" }, { tags: ["selected-tag"] }]) {
    const f = fixture();
    let tree = f.render();
    rows(tree)[0].props.onChange({ url: "https://example.org/new" });
    f.setStored(stored);
    f.failOptions();
    f.render();
    // Model a native submission without the picker fields replaced by error Descriptions.
    await f.submit({ note: "Keep selections" });
    assert.equal(f.prepared.length, 0, "must reject unavailable selections before preparing a write");
  }
});
test("late browser capture respects fields explicitly cleared by the user", () => {
  for (const field of ["url", "title"]) {
    const f = fixture();
    let tree = f.render();
    rows(tree)[0].props.onChange({ [field]: "typed" });
    tree = f.render();
    rows(tree)[0].props.onChange({ [field]: "" });
    f.render();
    const props = { defaultLink: "https://captured.example.org", defaultValues: { title: "Captured" } };
    f.render(props);
    tree = f.render(props);
    assert.equal(rows(tree)[0].props.row[field], "", field);
  }
});
