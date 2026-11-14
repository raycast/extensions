import assert from "node:assert/strict";
import test from "node:test";
import createLoader from "./load-ts.ts";
import type { MockValue } from "./load-ts.ts";

const native = { id: 10, pid: 20, app: "Test", title: "Test" };
const ax = { pid: 20, index: 1, title: "Test", subrole: "AXStandardWindow" };
const app = { id: "test", name: "Test", windows: [native] };

function fixture(result = "focused", failure?: Error) {
  const events: MockValue[] = [];
  const focus = async () => {
    events.push("focus");
    if (failure) throw failure;
    return result;
  };
  const { createWindowActions } = createLoader({
    "@raycast/api": {
      PopToRootType: { Immediate: "immediate" },
      Toast: { Style: { Failure: "failure" } },
      closeMainWindow: async (options) => events.push({ close: options }),
      showToast: async (toast) => events.push({ toast: toast.title }),
    },
    "./window-focus": { activateApplication: focus, focusNativeWindow: focus },
    "./windows": { raiseAXWindow: focus, sameWindow: (a, b) => a.id === b.id && a.pid === b.pid },
    "./helpers/applescript": { getErrorMessage: (error) => error.message },
  })("src/window-actions.tsx");
  const actions = createWindowActions(
    () => events.push("update"),
    () => events.push("refresh"),
  );
  return { actions, events };
}

for (const [method, target] of [
  ["activateApp", app],
  ["focusWindow", native],
  ["focusAXWindow", ax],
] as const) {
  test(`${method} ends the command only after successful focus so reopening starts a fresh list`, async () => {
    const { actions, events } = fixture();
    await actions[method](target);
    assert.deepEqual(events, ["focus", { close: { popToRootType: "immediate" } }]);
  });

  test(`${method} keeps the command open when focus fails`, async () => {
    const { actions, events } = fixture("focused", new Error("Focus failed"));
    await actions[method](target);
    assert.equal(events[0], "focus");
    assert.equal(
      events.some((event) => typeof event === "object" && "close" in event),
      false,
    );
    assert.equal(
      events.some((event) => event?.toast),
      true,
    );
  });
}

for (const [method, target, result] of [
  ["activateApp", app, "missing"],
  ["activateApp", app, "multiple"],
  ["focusWindow", native, "missing"],
] as const) {
  test(`${method} keeps the command open and refreshes when the target is ${result}`, async () => {
    const { actions, events } = fixture(result);
    await actions[method](target);
    assert.equal(
      events.some((event) => typeof event === "object" && "close" in event),
      false,
    );
    assert.equal(events.includes("refresh"), true);
    assert.equal(
      events.some((event) => event?.toast),
      true,
    );
  });
}
