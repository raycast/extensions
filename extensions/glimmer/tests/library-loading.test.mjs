import assert from "node:assert/strict";
import { test } from "node:test";
import * as contract from "../src/lib/contract.ts";
import { loadSource } from "./helpers/load-source.mjs";

function setup() {
  const pcs = [
    { id: "fast", name: "Fast PC", state: "ready" },
    { id: "slow", name: "Slow PC", state: "asleep" },
  ];
  const states = new Map();
  const refreshes = [];
  const listPCs = () => {};
  const listApps = () => {};
  states.set("pcs", { data: pcs, isLoading: false });
  for (const pc of pcs) states.set(pc.id, { isLoading: true });
  const List = Object.assign(() => {}, {
    Section: "section",
    Item: "item",
    Dropdown: Object.assign(() => {}, { Item: "dropdown-item" }),
  });
  const { default: Command } = loadSource("../src/stream-app.tsx", {
    "@raycast/api": {
      List,
      Icon: {},
      ActionPanel: "actions",
      Action: Object.assign(() => {}, { CopyToClipboard: "copy", CreateQuicklink: "quicklink" }),
    },
    "@raycast/utils": {
      useCachedPromise: (fn, args) => {
        assert.ok(fn === listPCs || fn === listApps);
        const key = fn === listPCs ? "pcs" : args[0];
        return { ...states.get(key), revalidate: () => refreshes.push(key) };
      },
    },
    react: { useState: () => ["visible", () => {}] },
    "./lib/contract": contract,
    "./lib/glimmer": { listPCs, listApps, errorMessage: (error) => error.message },
    "./components/shared": { PCControls: "controls", ErrorView: "error", NoPCs: "empty", stateAccessory: () => ({}) },
  });
  const sections = () => Command().props.children[1].map((node) => node.type(node.props));
  return { states, refreshes, Command, sections };
}

function items(section) {
  return [section.props.children].flat();
}

const desktop = { id: 1, name: "Desktop", hidden: false, running: false, hdr: true };

test("PC rows and actions are available before any app list finishes", () => {
  const h = setup();
  for (const section of h.sections()) {
    assert.equal(section.props.subtitle, "Loading apps…");
    const row = items(section)[0];
    assert.equal(row.props.subtitle, "Loading apps…");
    assert.ok(row.props.actions.props.children.find((node) => node?.type === "controls"));
  }
});

test("a ready PC shows apps while a second PC is pending, then survives its failure", () => {
  const h = setup();
  h.states.set("fast", { data: [desktop], isLoading: false });
  let [fast, slow] = h.sections();
  assert.equal(items(fast)[0].props.title, "Desktop");
  assert.equal(items(slow)[0].props.subtitle, "Loading apps…");
  h.states.set("slow", { error: new Error("PC did not answer"), isLoading: false });
  [fast, slow] = h.sections();
  assert.equal(items(fast)[0].props.title, "Desktop");
  assert.equal(slow.props.subtitle, "Apps unavailable");
  assert.equal(items(slow)[0].props.subtitle, "PC did not answer");
});

test("cached apps remain visible during refresh and refresh targets the selected PC", () => {
  const h = setup();
  h.states.set("fast", { data: [desktop], isLoading: true });
  const fast = h.sections()[0];
  assert.equal(items(fast)[0].props.title, "Desktop");
  const controls = items(fast)[0].props.actions.props.children.find((node) => node?.type === "controls");
  controls.props.refresh();
  assert.deepEqual(h.refreshes, ["pcs", "fast"]);
});

test("PC-list errors still show setup/retry instead of empty or loading rows", () => {
  const h = setup();
  const error = new Error("Install Glimmer");
  h.states.set("pcs", { error, isLoading: false });
  const view = h.Command();
  assert.equal(view.type, "error");
  assert.equal(view.props.error, error);
});
