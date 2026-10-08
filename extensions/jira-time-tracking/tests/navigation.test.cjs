const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { createRoot } = require("react-dom/client");
const { JSDOM } = require("jsdom");
const { act } = React;
const dom = new JSDOM("<!doctype html><html><body></body></html>");
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const issue = (key) => ({
  key,
  fields: { summary: `Fixture ${key}`, project: { key: key.split("-")[0], name: "Test" } },
});
function host(name) {
  return (props) =>
    React.createElement(
      "div",
      {
        "data-fixture-type": name,
        "data-fixture-id": props.id,
        ref: (element) => {
          if (element) element.fixtureProps = props;
        },
      },
      props.children,
    );
}
function fixtureUI(overrides = {}) {
  const Form = Object.assign(host("form"), {
    Dropdown: Object.assign(host("dropdown"), { Item: host("dropdown-item") }),
    DatePicker: host("date"),
    TextField: host("text-field"),
    TextArea: host("text-area"),
    Separator: host("separator"),
    Description: host("description"),
  });
  const Action = Object.assign(host("action"), {
    SubmitForm: host("submit"),
    Push: host("push"),
    OpenInBrowser: host("browser"),
    CopyToClipboard: host("copy"),
    Style: { Destructive: "destructive" },
  });
  const ActionPanel = Object.assign(host("actions"), { Section: host("action-section") });
  const Metadata = Object.assign(host("metadata"), { Label: host("label"), Separator: host("separator") });
  const List = Object.assign(host("list"), {
    Item: Object.assign(host("item"), { Detail: Object.assign(host("detail"), { Metadata }) }),
    Section: host("section"),
    EmptyView: host("empty"),
  });
  const calls = { pushed: [], popped: 0, posted: [], updated: [] };
  const prefs = { isJiraCloud: "cloud", domain: "example.test", defaultProject: "A", dailyHoursThreshold: "7" };
  const api = {
    Form,
    List,
    Action,
    ActionPanel,
    Detail: host("detail"),
    Icon: new Proxy({}, { get: (_, key) => key }),
    Color: {},
    Alert: { ActionStyle: {} },
    Keyboard: { Shortcut: { Common: { Edit: { modifiers: ["cmd"], key: "e" } } } },
    Toast: { Style: {} },
    showToast: async () => {},
    confirmAlert: async () => true,
    getPreferenceValues: () => prefs,
    useNavigation: () => ({ push: (element) => calls.pushed.push(element), pop: () => calls.popped++ }),
  };
  const cache = new Map();
  let controllers;
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const ext = ["index", "viewLoggedTime"].includes(name) ? "tsx" : "ts";
    const filename = path.join(__dirname, "../src", `${name}.${ext}`);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const module = { exports: {} };
    cache.set(name, module.exports);
    const requireFixture = (id) => {
      if (id === "@raycast/api") return api;
      if (id === "react" || id === "react/jsx-runtime") return require(id);
      if (id === "./requests")
        return {
          jiraRequest: async () => {
            throw new Error("No real Jira access in tests");
          },
        };
      if (id === "./controllers" && controllers) return controllers;
      if (id.startsWith("./")) return load(id.slice(2));
      throw new Error(`Unexpected import ${id}`);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename })(
      requireFixture,
      module,
      module.exports,
    );
    return module.exports;
  }
  controllers = {
    loadAllPages: load("controllers").loadAllPages,
    getProjects: async () => ({
      data: [
        { key: "A", name: "A" },
        { key: "B", name: "B" },
      ],
    }),
    getIssues: async (_, project) => ({ data: [issue(`${project}-1`), issue(`${project}-2`)] }),
    getWorklogs: async () => [],
    postTimeLog: async (...args) => calls.posted.push(args),
    updateWorklog: async (...args) => calls.updated.push(args),
    ...overrides,
  };
  return { load, calls, controllers };
}
function elements(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(elements);
  if (!value.props) return [];
  return [value, ...["children", "actions"].flatMap((key) => elements(value.props[key]))];
}
const action = (renderer, title) =>
  elements(renderer.root.findByType("form").props.actions).find((node) => node.props.title === title);
async function mount(Component, props = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const wrap = (element) => ({
    get props() {
      return element.fixtureProps;
    },
    findByProps: ({ id }) => wrap(element.querySelector(`[data-fixture-id="${id}"]`)),
    findByType: (type) => wrap(element.querySelector(`[data-fixture-type="${type}"]`)),
    findAllByType: (type) => Array.from(element.querySelectorAll(`[data-fixture-type="${type}"]`), wrap),
  });
  await act(async () => root.render(React.createElement(Component, props)));
  return {
    root: wrap(container),
    unmount: () => {
      root.unmount();
      container.remove();
    },
  };
}

test("equal-size project switches keep visible and submitted issue in agreement", async () => {
  const ui = fixtureUI();
  const renderer = await mount(ui.load("index").default);
  try {
    await act(async () => renderer.root.findByProps({ id: "projectId" }).props.onChange("B"));
    const field = renderer.root.findByProps({ id: "issueId" });
    assert.equal(field.props.value, "B-1");
    await act(async () => field.props.onChange("B-2"));
    assert.equal(renderer.root.findByProps({ id: "issueId" }).props.value, "B-2");
    await act(async () =>
      action(renderer, "Submit").props.onSubmit({
        issueId: "B-2",
        timeInput: "1h",
        description: "",
        startedAt: new Date(2026, 9, 2),
      }),
    );
    assert.equal(ui.calls.posted[0][1], "B-2");
  } finally {
    await act(async () => renderer.unmount());
  }
});

test("a late response from the previous project cannot replace the new project", async () => {
  const pendingA = deferred();
  const ui = fixtureUI({
    getIssues: (_, project) => (project === "A" ? pendingA.promise : Promise.resolve({ data: [issue("B-1")] })),
  });
  const renderer = await mount(ui.load("index").default);
  try {
    await act(async () => renderer.root.findByProps({ id: "projectId" }).props.onChange("B"));
    assert.equal(renderer.root.findByProps({ id: "issueId" }).props.value, "B-1");
    await act(async () => pendingA.resolve({ data: [issue("A-1")] }));
    assert.equal(renderer.root.findByProps({ id: "issueId" }).props.value, "B-1");
  } finally {
    await act(async () => renderer.unmount());
  }
});

test("empty and partially logged weekdays open a form with the selected date", async () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(12, 0, 0, 0);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  const entry = {
    issue: { key: "A-1", summary: "Fixture", project: { key: "A", name: "A" } },
    worklog: { id: "one", started: date.toISOString(), timeSpentSeconds: 3600, author: { displayName: "Fixture" } },
  };
  const ui = fixtureUI({ getWorklogs: async () => [entry] });
  const renderer = await mount(ui.load("viewLoggedTime").default);
  try {
    const sections = renderer.root.findAllByType("section");
    const partial = sections.find((section) =>
      section.findAllByType("item").some((item) => item.props.title === "A-1"),
    );
    const prompts = partial.findAllByType("item").filter((item) => item.props.title === "Log Time for This Day");
    assert.equal(prompts.length, 1);
    const open = elements(prompts[0].props.actions).find((node) => node.props.title === "Open Log Time");
    assert.equal(open.props.target.props.initialDate.getDate(), date.getDate());
    const form = await mount(open.props.target.type, open.props.target.props);
    try {
      assert.equal(form.root.findByProps({ id: "startedAt" }).props.value.getDate(), date.getDate());
      await act(async () =>
        action(form, "Submit").props.onSubmit({ issueId: "A-1", timeInput: "1h", description: "", startedAt: date }),
      );
      assert.equal(ui.calls.popped, 1);
    } finally {
      await act(async () => form.unmount());
    }
    const empty = renderer.root
      .findAllByType("item")
      .find((item) => item.props.title === "Log Time for This Day" && item.props.subtitle.startsWith("0h"));
    assert.ok(elements(empty.props.actions).some((node) => node.props.title === "Open Log Time" && node.props.target));
  } finally {
    await act(async () => renderer.unmount());
  }
});

test("editing only time sends no replacement for the original rich-text comment", async () => {
  const started = new Date();
  started.setDate(1);
  const entry = {
    issue: { key: "A-1", summary: "Fixture", project: { key: "A", name: "A" } },
    worklog: {
      id: "one",
      started: started.toISOString(),
      timeSpentSeconds: 3600,
      author: { displayName: "Fixture" },
      comment: {
        type: "doc",
        version: 1,
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Keep rich text", marks: [{ type: "strong" }] }] },
        ],
      },
    },
  };
  const ui = fixtureUI({ getWorklogs: async () => [entry] });
  const renderer = await mount(ui.load("viewLoggedTime").default);
  let form;
  try {
    const item = renderer.root.findAllByType("item").find((node) => node.props.title === "A-1");
    const edit = elements(item.props.actions).find((node) => node.props.title === "Edit Worklog");
    await act(async () => edit.props.onAction());
    form = await mount(ui.calls.pushed[0].type, ui.calls.pushed[0].props);
    await act(async () =>
      action(form, "Update Worklog").props.onSubmit({
        timeInput: "2h",
        description: "Keep rich text",
        startedAt: started,
      }),
    );
    assert.equal(ui.calls.updated[0][2], 7200);
    assert.equal(ui.calls.updated[0][3], undefined);
  } finally {
    if (form) await act(async () => form.unmount());
    await act(async () => renderer.unmount());
  }
});
