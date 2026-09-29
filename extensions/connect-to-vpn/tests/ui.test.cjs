const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { create, act } = require("react-test-renderer");
const { apiMock, loadSource, service } = require("./helpers.cjs");
global.IS_REACT_ACT_ENVIRONMENT = true;

async function mount(t, error) {
  const ctx = apiMock({ "network-service-last-used": "Old VPN" });
  const state = {
    favoriteServices: [service({ favorite: true })],
    otherServices: [],
    invalidServices: [],
    error,
    hideInvalidDevices: true,
    refreshServicesFromAction: async () => {},
    getActionForService: () => ({ actionName: "Connect", action: async () => {} }),
  };
  ctx.api.List = Object.assign((props) => React.createElement("list", props), {
    Item: (props) => React.createElement("row", props, props.actions),
    Section: "section",
    EmptyView: "empty",
  });
  ctx.api.Action = "action";
  ctx.api.ActionPanel = "actions";
  ctx.api.Keyboard = { Shortcut: { Common: { Refresh: {} } } };
  const prompts = [];
  let accepted = false;
  ctx.api.confirmAlert = async (prompt) => {
    prompts.push(prompt);
    return accepted;
  };
  const Command = loadSource("index.tsx", {
    "@raycast/api": ctx.api,
    "./network-services": {
      LAST_USED_KEY: "network-service-last-used",
      useNetworkServices: () => state,
      normalizeHardwarePort: () => "",
      transitionLabel: () => undefined,
    },
  }).default;
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(Command));
  });
  t.after(async () => act(async () => renderer.unmount()));
  return {
    ...ctx,
    renderer,
    prompts,
    accept: () => {
      accepted = true;
    },
  };
}

test("refresh errors remain visible alongside rows and in the search navigation title", async (t) => {
  const ctx = await mount(t, new Error("scutil timed out"));
  assert.deepEqual(
    ctx.renderer.root.findAllByType("row").map((node) => node.props.title),
    ["Unable to Refresh Network Services", "Work VPN"],
  );
  assert.equal(ctx.renderer.root.findAllByType("row")[0].props.subtitle, "scutil timed out");
  assert.equal(ctx.renderer.root.findByType("list").props.navigationTitle, "VPN Status May Be Outdated");
  assert.equal(ctx.renderer.root.findAllByType("empty").length, 0);
});

test("choosing a shortcut VPN is appended and requires confirmation before changing storage", async (t) => {
  const ctx = await mount(t);
  const actions = ctx.renderer.root.findAllByType("action");
  assert.deepEqual(
    actions.map((action) => action.props.title),
    [
      "Connect",
      "Refresh",
      "Open Network Settings",
      "Remove from Favorites",
      "Move Favorite Earlier",
      "Move Favorite Later",
      "Use for Toggle Last Used",
    ],
  );
  await act(async () => actions.at(-1).props.onAction());
  assert.equal(ctx.storage.get("network-service-last-used"), "Old VPN");
  assert.match(ctx.prompts[0].title, /Work VPN/);
  ctx.accept();
  await act(async () => actions.at(-1).props.onAction());
  assert.equal(ctx.storage.get("network-service-last-used"), "Work VPN");
});
