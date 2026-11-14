import assert from "node:assert/strict";
import test from "node:test";
import { findAll, renderer } from "./render-ui.ts";
import type { TestNode } from "./render-ui.ts";

const native = (pid: number, app: string, extra = {}) => ({
  id: pid * 10,
  pid,
  app,
  localizedName: app,
  bundlePath: `/Applications/${app}.app`,
  title: `${app} window`,
  space: 1,
  "has-ax-reference": true,
  ...extra,
});
const snapshot = (windows: ReturnType<typeof native>[], extra = {}) => ({
  windows,
  applications: [],
  applicationOrder: [],
  metadataByPid: {},
  browserCounts: {},
  browserTabs: {},
  axWindowsByPid: {},
  ...extra,
});
const rows = (view: ReturnType<typeof renderer>, tree: TestNode) =>
  findAll(tree, (node) => node.type === view.ui.List.Item).map((node) => node.props.title);
const sections = (view: ReturnType<typeof renderer>, tree: TestNode) =>
  findAll(tree, (node) => node.type === view.ui.List.Section).map((node) => ({
    title: node.props.title,
    apps: rows(view, node),
  }));

test("arrangement defaults to recent use and offers name, browser and Space grouping", () => {
  const view = renderer(snapshot([native(1, "Safari"), native(2, "Editor")], { applicationOrder: [2, 1] }));
  const tree = view.render();
  const dropdown = tree.props.searchBarAccessory;
  assert.equal(dropdown.type, view.ui.List.Dropdown);
  assert.equal(dropdown.props.value, "recent");
  assert.deepEqual(
    findAll(dropdown, (node) => node.type === view.ui.List.Dropdown.Item).map((node) => node.props.value),
    ["recent", "name", "type", "space"],
  );
  assert.deepEqual(rows(view, tree), ["Editor", "Safari"]);
  assert.deepEqual(sections(view, tree), []);
});

test("name arrangement handles case and numbers and preserves the original recent order", () => {
  const view = renderer(
    snapshot([native(1, "Zulu"), native(2, "editor 10"), native(3, "Editor 2"), native(4, "Alpha")], {
      applicationOrder: [1, 2, 3, 4],
    }),
  );
  view.render().props.searchBarAccessory.props.onChange("name");
  const named = view.render();
  assert.deepEqual(rows(view, named), ["Alpha", "Editor 2", "editor 10", "Zulu"]);
  assert.deepEqual(sections(view, named), []);
  named.props.searchBarAccessory.props.onChange("recent");
  assert.deepEqual(rows(view, view.render()), ["Zulu", "editor 10", "Editor 2", "Alpha"]);
});

test("browser grouping retains recent order within each section including windowless browsers", () => {
  const view = renderer(
    snapshot(
      [
        native(1, "Safari"),
        native(2, "Editor", { isMinimized: true, space: 0 }),
        native(3, "Firefox", { localizedName: "My Browser" }),
        native(4, "Mail", { isHidden: true, space: 0 }),
      ],
      {
        applicationOrder: [4, 3, 5, 2, 1],
        applications: [{ pid: 5, localizedName: "Zen", bundlePath: "/Applications/Zen.app" }],
        axWindowsByPid: { 5: [] },
      },
    ),
  );
  view.render().props.searchBarAccessory.props.onChange("type");
  const tree = view.render();
  assert.deepEqual(sections(view, tree), [
    { title: "Browsers", apps: ["My Browser", "Zen", "Safari"] },
    { title: "Applications", apps: ["Mail", "Editor"] },
  ]);
  const zen = findAll(tree, (node) => node.type === view.ui.List.Item && node.props.title === "Zen")[0];
  assert(findAll(zen, (node) => node.type === view.ui.Action && node.props.title === "Show Application")[0]);
});

test("browser grouping omits empty sections and retains the empty view when no apps are running", () => {
  for (const [apps, expected] of [
    [[native(1, "Safari")], [{ title: "Browsers", apps: ["Safari"] }]],
    [[native(2, "Editor")], [{ title: "Applications", apps: ["Editor"] }]],
    [[], []],
  ] as const) {
    const view = renderer(snapshot([...apps]));
    view.render().props.searchBarAccessory.props.onChange("type");
    const tree = view.render();
    assert.deepEqual(sections(view, tree), expected);
    assert.equal(findAll(tree, (node) => node.type === view.ui.List.EmptyView).length, apps.length === 0 ? 1 : 0);
  }
});

test("Space grouping sorts numbered sections, preserves recent order and lists each app once", () => {
  const view = renderer(
    snapshot(
      [
        native(1, "Editor", { space: 10 }),
        native(2, "Mail", { space: 2, isHidden: true }),
        native(3, "Notes", { space: 2, isMinimized: true }),
        native(3, "Notes", { id: 31, space: 2 }),
        native(4, "Code", { space: 2 }),
        native(4, "Code", { id: 41, space: 10 }),
        native(5, "Music", { space: 0, isMinimized: true }),
        native(6, "Mixed", { space: 2 }),
        native(6, "Mixed", { id: 61, space: 0 }),
      ],
      {
        applicationOrder: [3, 7, 4, 5, 2, 1, 6],
        applications: [{ pid: 7, localizedName: "Windowless", bundlePath: "/Applications/Windowless.app" }],
        axWindowsByPid: { 7: [] },
      },
    ),
  );
  view.render().props.searchBarAccessory.props.onChange("space");
  const tree = view.render();
  assert.deepEqual(sections(view, tree), [
    { title: "Space 2", apps: ["Notes", "Mail"] },
    { title: "Space 10", apps: ["Editor"] },
    { title: "Multiple Spaces", apps: ["Code"] },
    { title: "Unknown Space", apps: ["Windowless", "Music", "Mixed"] },
  ]);
  assert.equal(rows(view, tree).length, 7);
});

test("Space grouping uses resolved browser windows without guessing bridge-only or incomplete Spaces", () => {
  const cases = [
    {
      name: "resolved window replaces the native Space",
      data: { browserTabs: { safari: [{ id: "10", title: "Work", space: 3, tabs: [] }] } },
      expected: "Space 3",
    },
    {
      name: "multiple windows on one Space still form a single Space group",
      data: {
        browserTabs: {
          safari: [
            { id: "10", title: "One", space: 3, tabs: [] },
            { id: "11", title: "Two", space: 3, tabs: [] },
          ],
        },
      },
      expected: "Space 3",
    },
    {
      name: "known windows on distinct Spaces prove multiple Spaces even with an unknown window",
      data: {
        browserTabs: {
          safari: [
            { id: "10", title: "One", space: 1, tabs: [] },
            { id: "11", title: "Two", space: 3, tabs: [] },
            { id: "12", title: "Unknown", tabs: [] },
          ],
        },
      },
      expected: "Multiple Spaces",
    },
    {
      name: "bridge-only window never borrows the native Space",
      data: { browserTabs: { safari: [{ id: "session:10", title: "Work", tabs: [] }] } },
      expected: "Unknown Space",
    },
    {
      name: "partially known window Spaces remain unknown",
      data: {
        browserTabs: {
          safari: [
            { id: "10", title: "One", space: 2, tabs: [] },
            { id: "11", title: "Two", tabs: [] },
          ],
        },
      },
      expected: "Unknown Space",
    },
    {
      name: "empty resolved windows do not reuse stale native Space data",
      data: { browserTabs: { safari: [] } },
      expected: "Unknown Space",
    },
    {
      name: "zero-window summary does not reuse stale native Space data",
      data: { browserCounts: { safari: { windows: 0 } } },
      expected: "Unknown Space",
    },
    {
      name: "summary reveals additional unresolved windows",
      data: { browserCounts: { safari: { windows: 2 } } },
      expected: "Unknown Space",
    },
    {
      name: "summary reveals windows absent from the cache",
      data: {
        browserCounts: { safari: { windows: 2 } },
        browserTabs: { safari: [{ id: "10", title: "Work", space: 2, tabs: [] }] },
      },
      expected: "Unknown Space",
    },
  ];
  for (const scenario of cases) {
    const view = renderer(snapshot([native(1, "Safari", { space: 2 })], scenario.data));
    view.render().props.searchBarAccessory.props.onChange("space");
    assert.deepEqual(sections(view, view.render()), [{ title: scenario.expected, apps: ["Safari"] }], scenario.name);
  }
});

test("Space sections stay in place during selection and regroup after an explicit arrangement change", () => {
  const data = snapshot([native(1, "Notes", { space: 1 }), native(2, "Editor", { space: 2 })]);
  const view = renderer(data);
  view.render().props.searchBarAccessory.props.onChange("space");
  const initial = view.render();
  const selected = findAll(initial, (node) => node.type === view.ui.List.Item)[0].props.id;
  initial.props.onSelectionChange(selected);
  data.windows = [native(1, "Notes", { space: 3 }), native(2, "Editor", { space: 2 })];
  const held = view.render();
  assert.deepEqual(sections(view, held), [
    { title: "Space 1", apps: ["Notes"] },
    { title: "Space 2", apps: ["Editor"] },
  ]);
  assert.equal(held.props.selectedItemId, selected);
  held.props.searchBarAccessory.props.onChange("space");
  assert.deepEqual(sections(view, view.render()), [
    { title: "Space 2", apps: ["Editor"] },
    { title: "Space 3", apps: ["Notes"] },
  ]);
});

test("Space grouping uses AX fallback per process and rejects invalid native Space values", () => {
  const view = renderer(
    snapshot(
      [
        native(1, "Resolved", { space: 9, "has-ax-reference": false }),
        native(2, "Unresolved", { space: 9, "has-ax-reference": false }),
        native(3, "Failed", { space: 9, "has-ax-reference": false }),
        native(4, "Invalid", { space: 1.5 }),
        native(5, "Split", { space: 1 }),
        native(6, "Split", { space: 9, "has-ax-reference": false }),
        native(7, "Mixed process", { space: 1 }),
        native(7, "Mixed process", { id: 71, space: 9, "has-ax-reference": false }),
        native(8, "Incomplete process", { space: 1 }),
        native(8, "Incomplete process", { id: 81, space: 9, "has-ax-reference": false }),
      ],
      {
        axWindowsByPid: {
          1: [{ pid: 1, index: 1, title: "Actual", space: 3 }],
          3: null,
          6: [{ pid: 6, index: 1, title: "Other process", space: 2 }],
          7: [{ pid: 7, index: 1, title: "Fallback", space: 2 }],
        },
      },
    ),
  );
  view.render().props.searchBarAccessory.props.onChange("space");
  assert.deepEqual(sections(view, view.render()), [
    { title: "Space 3", apps: ["Resolved"] },
    { title: "Multiple Spaces", apps: ["Split", "Mixed process"] },
    { title: "Unknown Space", apps: ["Unresolved", "Failed", "Invalid", "Incomplete process"] },
  ]);
});

test("Space sections follow refreshed data and omit empty sections", () => {
  const data = snapshot([native(1, "Editor", { space: 2 })]);
  const view = renderer(data);
  view.render().props.searchBarAccessory.props.onChange("space");
  assert.deepEqual(sections(view, view.render()), [{ title: "Space 2", apps: ["Editor"] }]);
  data.windows = [native(1, "Editor", { space: 3 })];
  assert.deepEqual(sections(view, view.render()), [{ title: "Space 3", apps: ["Editor"] }]);
  data.windows = [];
  const empty = view.render();
  assert.deepEqual(sections(view, empty), []);
  assert.equal(findAll(empty, (node) => node.type === view.ui.List.EmptyView).length, 1);
});

test("search stays ranked by relevance and clearing it restores the selected arrangement", () => {
  for (const order of ["name", "type", "space"]) {
    const view = renderer(
      snapshot([native(1, "Safari", { title: "Project" }), native(2, "Alpha", { title: "Project notes" })], {
        applicationOrder: [2, 1],
      }),
    );
    view.render().props.searchBarAccessory.props.onChange(order);
    const browsing = view.render();
    const initialRows = rows(view, browsing);
    const initialSections = sections(view, browsing);
    browsing.props.onSearchTextChange("project");
    const searching = view.render();
    assert.equal(searching.props.searchBarAccessory, undefined);
    assert.deepEqual(sections(view, searching), [{ title: "Tabs and Windows", apps: ["Project", "Project notes"] }]);
    assert.deepEqual(rows(view, searching), ["Project", "Project notes"]);
    searching.props.onSearchTextChange("");
    const restored = view.render();
    assert.equal(restored.props.searchBarAccessory.props.value, order);
    assert.deepEqual(rows(view, restored), initialRows);
    assert.deepEqual(sections(view, restored), initialSections);
  }
});
