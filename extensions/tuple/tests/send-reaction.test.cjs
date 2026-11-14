const test = require("node:test");
const assert = require("node:assert/strict");
const createLoader = require("./load-typescript.cjs");

const EmptyView = () => null;
const ErrorView = () => null;
const List = Object.assign(() => null, { Item: () => null, EmptyView });

function render(state) {
  const load = createLoader(undefined, {
    "@raycast/api": { List, Action: () => null, ActionPanel: () => null, Icon: { Message: "message" } },
    "@raycast/utils": { usePromise: () => state },
    react: { useState: () => [false, () => {}] },
    "./lib/empty-state": { TupleErrorEmptyView: ErrorView },
    "./lib/reactions": { reactionTitle: (reaction) => reaction },
  });
  return load("src/send-reaction.tsx").default().props.children[1];
}

test("a populated reaction list leaves unmatched searches to Raycast's default empty state", () => {
  assert.equal(render({ data: ["thumbs-up"], isLoading: false }), null);
});

test("the CLI empty message appears only for a loaded empty reaction list", () => {
  const empty = render({ data: [], isLoading: false });
  assert.equal(empty.type, EmptyView);
  assert.equal(empty.props.title, "No Reactions Available");
  assert.equal(render({ data: undefined, isLoading: true }), null);
});

test("reaction discovery failures retain the error view rather than the CLI empty message", () => {
  const error = new Error("Discovery failed");
  const view = render({ data: [], error, isLoading: false });
  assert.equal(view.type, ErrorView);
  assert.equal(view.props.error, error);
});
