import assert from "node:assert/strict";
import test from "node:test";
import { load } from "./load-source.mjs";

function setup({ defaultAction = "meeting", failLink = false, failRefresh = false } = {}) {
  const oauth = {};
  const user = { slug: "example", scheduling_url: "https://calendly.com/example", avatar_url: null };
  const event = {
    uri: "https://api.calendly.com/event_types/EXAMPLE",
    name: "Introduction",
    duration: 30,
    slug: "intro",
    scheduling_url: "https://calendly.com/example/intro",
  };
  const requests = [];
  const copied = [];
  const failures = [];
  const refreshed = [];
  const getCurrentUser = async () => user;
  const listEventTypes = async () => [event];
  const mocks = {
    "./oauth/calendly": { calendlyOAuth: oauth },
    "./api/users": { getCurrentUser },
    "./api/event-types": {
      listEventTypes,
      createSingleUseLink: async (uri) => {
        requests.push(uri);
        if (failLink) throw new Error("Link failed");
        return { booking_url: "https://calendly.com/d/example" };
      },
    },
    "@raycast/api": {
      List: Object.assign(() => null, { Item: "item" }),
      ActionPanel: "panel",
      Action: Object.assign(() => null, { CopyToClipboard: "copy", OpenInBrowser: "open" }),
      Icon: {},
      Image: { Mask: { Circle: "circle" } },
      Toast: { Style: { Animated: "animated" } },
      Keyboard: { Shortcut: { Common: { Refresh: {} } } },
      getPreferenceValues: () => ({ defaultAction }),
      showToast: async () => ({ hide: async () => {} }),
      showHUD: async () => {},
      Clipboard: { copy: async (value) => copied.push(value) },
    },
    "@raycast/utils": {
      withAccessToken: (service) => {
        assert.equal(service, oauth, "Share Meeting Link must use the shared OAuth service");
        return (component) => component;
      },
      useCachedPromise: (fn) => {
        assert.ok(fn === getCurrentUser || fn === listEventTypes, "Use the shared API functions");
        return {
          data: fn === getCurrentUser ? user : [event],
          isLoading: false,
          revalidate: async () => {
            refreshed.push(fn);
            if (failRefresh) throw new Error("Refresh failed");
          },
        };
      },
      showFailureToast: async (error) => failures.push(error.message),
    },
  };
  const Command = load("../src/calendly.tsx", mocks).default;
  return { tree: Command(), requests, copied, failures, refreshed, event };
}

function descendants(element) {
  if (!element || typeof element !== "object") return [];
  return [element, ...[element.props?.children].flat(Infinity).flatMap(descendants)];
}

for (const defaultAction of ["meeting", "one-time"]) {
  test(`shared sign-in preserves the ${defaultAction} default action and existing links`, async () => {
    const state = setup({ defaultAction });
    const rows = descendants(state.tree).filter((node) => node.type === "item");
    const profile = rows.find((row) => row.props.title === "Copy My Link");
    assert.equal(
      descendants(profile.props.actions).find((node) => node.type === "copy").props.content,
      "https://calendly.com/example",
    );
    const event = rows.find((row) => row.props.title === "Introduction");
    const actions = descendants(event.props.actions)
      .filter((node) => node.props?.event)
      .map((node) => node.type(node.props));
    assert.equal(actions[0].props.title, defaultAction === "meeting" ? "Copy Meeting URL" : "Copy Single Use Link");
    await actions.find((action) => action.props.title === "Copy Single Use Link").props.onAction();
    assert.deepEqual(state.requests, [state.event.uri]);
    assert.deepEqual(state.copied, ["https://calendly.com/d/example"]);
  });
}

test("single-use link failures show an error without copying", async () => {
  const state = setup({ failLink: true });
  const event = descendants(state.tree).find((row) => row.props?.title === "Introduction");
  const action = descendants(event.props.actions)
    .filter((node) => node.props?.event)
    .map((node) => node.type(node.props))
    .find((node) => node.props.title === "Copy Single Use Link");
  await action.props.onAction();
  assert.deepEqual(state.copied, []);
  assert.deepEqual(state.failures, ["Link failed"]);
});

for (const failRefresh of [false, true]) {
  test(`refresh updates both shared queries and handles failure=${failRefresh}`, async () => {
    const state = setup({ failRefresh });
    const row = descendants(state.tree).find((node) => node.props?.title === "Refresh Data");
    const refresh = row.props.actions.props.children;
    await refresh.type().props.onAction();
    assert.equal(state.refreshed.length, 2);
    assert.deepEqual(state.failures, failRefresh ? ["Refresh failed"] : []);
  });
}
