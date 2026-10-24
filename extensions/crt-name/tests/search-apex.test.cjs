const assert = require("node:assert/strict");
const { resolve } = require("node:path");
const { test } = require("node:test");
const { loadModule } = require("./load-module.cjs");

// Exercise the real command's rendered action props without a Raycast host.

function renderCommand(searchText, sort) {
  const records = Array.from({ length: 205 }, (_, i) => ({
    subdomain: `host-${String(i).padStart(3, "0")}.example.com`,
    firstSeen: new Date(Date.UTC(2020, 0, 1, 0, 0, i)).toISOString(),
  }));
  records.push({ subdomain: "*.example.com", firstSeen: null });
  const state = [searchText, sort, 100];
  let index = 0;
  const api = {
    Action: Object.assign(() => {}, { OpenInBrowser: "OpenInBrowser", CopyToClipboard: "CopyToClipboard" }),
    ActionPanel: Object.assign(() => {}, { Section: "ActionSection" }),
    List: Object.assign(() => {}, {
      Dropdown: Object.assign(() => {}, { Item: "DropdownItem" }),
      Item: "ListItem",
      Section: "ListSection",
      EmptyView: "EmptyView",
    }),
    Icon: {},
    Keyboard: { Shortcut: { Common: { Copy: {} } } },
  };
  const Command = loadModule(resolve(__dirname, "../src/search-apex.tsx"), {
    "@raycast/api": api,
    "@raycast/utils": { useCachedPromise: () => ({ data: { apex: "example.com", results: records } }) },
    "./api": { searchApex: () => {}, invalidateApexCache: () => {} },
    react: { useState: () => [state[index++], () => {}], useMemo: (fn) => fn(), useEffect: () => {} },
  }).default;
  return Command({ arguments: { apex: "example.com" } });
}

function elements(tree, type) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => elements(child, type));
  return [
    ...(tree.type === type ? [tree] : []),
    ...elements(tree.props?.children, type),
    ...elements(tree.props?.actions, type),
  ];
}

test("command copies the complete sorted set when filtered and when the filter matches nothing", () => {
  for (const filter of ["", "host-00", "missing"]) {
    const tree = renderCommand(filter, "first-seen-descending");
    assert.ok(elements(tree, "ListItem").length <= 100);
    const copies = elements(tree, "CopyToClipboard").filter((el) => el.props.title === "Copy All Subdomains");
    assert.ok(copies.length > 0);
    for (const copy of copies) {
      const lines = copy.props.content.split("\n");
      assert.equal(lines.length, 206);
      assert.equal(lines[0], "host-204.example.com");
      assert.equal(lines.at(-1), "*.example.com");
    }
  }
});

test("wildcard rows can be copied but have no open or copy URL action", () => {
  const tree = renderCommand("*", "alphabetical");
  const items = elements(tree, "ListItem");
  assert.equal(items.length, 1);
  assert.equal(
    elements(items[0].props.actions, "OpenInBrowser").filter((el) => el.props.title === "Open Subdomain").length,
    0,
  );
  assert.equal(
    elements(items[0].props.actions, "CopyToClipboard").filter((el) => el.props.title === "Copy URL").length,
    0,
  );
  const copy = elements(items[0].props.actions, "CopyToClipboard").find((el) => el.props.title === "Copy Subdomain");
  assert.equal(copy.props.content, "*.example.com");
});
