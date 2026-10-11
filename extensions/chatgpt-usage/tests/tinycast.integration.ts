import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { nodes, runtimePath, tinycastHarness, RenderNode } from "./helpers/tinycast";

const options = { skip: !existsSync(runtimePath) ? "Install Tinycast or set TINYCAST_RUNTIME_PATH" : false };

function inlineDetail(tree: RenderNode) {
  return nodes(tree).find((node) => node.type === "Detail" && node.props?.isLoading === false);
}

function markdown(tree: RenderNode) {
  return String(inlineDetail(tree)?.props?.markdown ?? "");
}

test(
  "the built extension renders real usage inside Tinycast's installed runtime with buffered process output",
  options,
  async () => {
    const harness = tinycastHarness();
    try {
      harness.start();
      const tree = await harness.waitFor((tree) =>
        nodes(tree).some((node) => node.props?.title === "5h 71% · W 44%" && node.props?.isLoading === false),
      );
      assert.ok(nodes(tree).some((node) => node.props?.title === "5-hour limit · 71% left"));
      assert.ok(nodes(tree).some((node) => node.props?.title === "Weekly limit · 44% left"));
      assert.ok(nodes(tree).find((node) => node.type === "MenuBarExtra")?.props?.icon);
      assert.deepEqual(harness.failures, []);
      assert.ok(harness.calls.includes("proc.wait") || harness.calls.includes("proc.run"));
      assert.ok(!harness.calls.includes("proc.read"));
    } finally {
      harness.stop();
    }
  },
);

test("Tinycast refresh action keeps cached percentages and marks a failed refresh", options, async () => {
  const harness = tinycastHarness();
  try {
    harness.start();
    const tree = await harness.waitFor((tree) =>
      nodes(tree).some((node) => node.props?.title === "5h 71% · W 44%" && node.props?.isLoading === false),
    );
    harness.setScenario("usage-error");
    harness.refresh(tree);
    const failed = await harness.waitFor((tree) =>
      nodes(tree).some((node) => node.props?.title === "5h 71% · W 44% !" && node.props?.isLoading === false),
    );
    assert.ok(nodes(failed).some((node) => node.props?.title === "Couldn't refresh usage"));
    assert.ok(!harness.calls.includes("feedback.showToast"));
    assert.deepEqual(harness.failures, []);
    harness.setScenario("success");
    harness.refresh(failed);
    await harness.waitFor((tree) =>
      nodes(tree).some((node) => node.props?.title === "5h 71% · W 44%" && node.props?.isLoading === false),
    );
  } finally {
    harness.stop();
  }
});

test("Tinycast shows setup guidance when signed out instead of inventing a quota", options, async () => {
  const harness = tinycastHarness();
  try {
    harness.setScenario("signed-out");
    harness.start();
    const tree = await harness.waitFor((tree) =>
      nodes(tree).some((node) => node.props?.title === "Usage unavailable" && node.props?.isLoading === false),
    );
    assert.ok(JSON.stringify(tree).includes("codex login"));
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

test("Tinycast icon-only preference still exposes both limits in the menu", options, async () => {
  const harness = tinycastHarness("icon");
  try {
    harness.start();
    const tree = await harness.waitFor((tree) =>
      nodes(tree).some((node) => node.props?.title === "Weekly limit · 44% left"),
    );
    const menu = nodes(tree).find((node) => node.type === "MenuBarExtra");
    assert.equal(menu?.props?.title, undefined);
    assert.ok(menu?.props?.icon);
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

for (const [displayMode, title] of [
  ["both", "5h 71% · W 44%"],
  ["five-hour", "5h 71%"],
  ["weekly", "W 44%"],
]) {
  test(`Tinycast can hide the menu bar dial in ${displayMode} mode without hiding row icons`, options, async () => {
    const harness = tinycastHarness(displayMode, "usage", {}, { hideDialIcon: true });
    try {
      harness.start();
      const tree = await harness.waitFor((tree) =>
        nodes(tree).some(
          (node) => node.type === "MenuBarExtra" && node.props?.title === title && node.props?.isLoading === false,
        ),
      );
      const menu = nodes(tree).find((node) => node.type === "MenuBarExtra");
      assert.equal(menu?.props?.icon, undefined);
      assert.ok(nodes(tree).find((node) => node.props?.title === "5-hour limit · 71% left")?.props?.icon);
      assert.ok(nodes(tree).find((node) => node.props?.title === "Weekly limit · 44% left")?.props?.icon);
      assert.deepEqual(harness.failures, []);
    } finally {
      harness.stop();
    }
  });
}

test("Hide Dial Icon keeps icon-only mode visible", options, async () => {
  const harness = tinycastHarness("icon", "usage", {}, { hideDialIcon: true });
  try {
    harness.start();
    const tree = await harness.waitFor((tree) =>
      nodes(tree).some((node) => node.props?.title === "Weekly limit · 44% left"),
    );
    const menu = nodes(tree).find((node) => node.type === "MenuBarExtra");
    assert.equal(menu?.props?.title, undefined);
    assert.ok(menu?.props?.icon);
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

test("Hide Dial Icon doesn't hide the menu bar error indicator", options, async () => {
  const harness = tinycastHarness("both", "usage", {}, { hideDialIcon: true });
  try {
    harness.setScenario("signed-out");
    harness.start();
    const tree = await harness.waitFor((tree) =>
      nodes(tree).some((node) => node.props?.title === "Usage unavailable" && node.props?.isLoading === false),
    );
    const menu = nodes(tree).find((node) => node.type === "MenuBarExtra");
    assert.ok(menu?.props?.icon);
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

test("the menu's dashboard action opens ChatGPT's overview page", options, async () => {
  const harness = tinycastHarness();
  try {
    harness.start();
    const tree = await harness.waitFor((tree) =>
      nodes(tree).some((node) => node.props?.title === "5h 71% · W 44%" && node.props?.isLoading === false),
    );
    harness.action(tree, "Open Usage Dashboard");
    const args = await harness.waitForCall("system.open");
    assert.equal(args[0], "https://chatgpt.com/settings/usage?tab=overview");
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

test("the menu can launch the inline usage command", options, async () => {
  const harness = tinycastHarness();
  try {
    harness.start();
    const tree = await harness.waitFor((tree) =>
      nodes(tree).some((node) => node.props?.title === "5h 71% · W 44%" && node.props?.isLoading === false),
    );
    harness.action(tree, "View Plan Usage");
    const args = await harness.waitForCall("system.launchCommand");
    assert.deepEqual(args[0], { name: "view-usage", type: "userInitiated" });
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

test("Tinycast renders both limits inline and opens the correct dashboard URL", options, async () => {
  const harness = tinycastHarness("icon", "view-usage");
  try {
    harness.start();
    const tree = await harness.waitFor(
      (tree) => markdown(tree).includes("71% left") && markdown(tree).includes("44% left"),
    );
    assert.ok(nodes(tree).some((node) => node.type === "Detail.Metadata"));
    assert.ok(
      nodes(tree).some(
        (node) =>
          node.type === "Detail.Metadata.Link" &&
          node.props?.target === "https://chatgpt.com/settings/usage?tab=overview",
      ),
    );
    harness.action(tree, "Open Usage Dashboard");
    const args = await harness.waitForCall("system.open");
    assert.equal(args[0], "https://chatgpt.com/settings/usage?tab=overview");
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

test("Tinycast's inline view preserves cached usage on refresh failure and recovers", options, async () => {
  const harness = tinycastHarness("both", "view-usage");
  try {
    harness.start();
    const tree = await harness.waitFor((tree) => markdown(tree).includes("71% left"));
    harness.setScenario("usage-error");
    harness.refresh(tree);
    const failed = await harness.waitFor((tree) => markdown(tree).includes("Last known usage"));
    assert.ok(markdown(failed).includes("71% left"));
    assert.ok(markdown(failed).includes("Could not read subscription usage"));
    harness.setScenario("success");
    harness.refresh(failed);
    await harness.waitFor(
      (tree) => markdown(tree).includes("71% left") && !markdown(tree).includes("Last known usage"),
    );
    assert.ok(!harness.calls.includes("feedback.showToast"));
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

test("Tinycast's inline view handles signed-out accounts without fake percentages", options, async () => {
  const harness = tinycastHarness("both", "view-usage");
  try {
    harness.setScenario("signed-out");
    harness.start();
    const tree = await harness.waitFor((tree) => markdown(tree).includes("Usage unavailable"));
    assert.ok(markdown(tree).includes("codex login"));
    assert.ok(!markdown(tree).includes("% left"));
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

test("Tinycast's inline view doesn't show old percentages after a reset", options, async () => {
  const harness = tinycastHarness("both", "view-usage");
  try {
    harness.setScenario("expired");
    harness.start();
    const tree = await harness.waitFor((tree) => markdown(tree).includes("Awaiting refresh"));
    assert.ok(!markdown(tree).includes("71% left"));
    assert.ok(markdown(tree).includes("44% left"));
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

test("Tinycast's inline view reports an account with no fixed windows without fake percentages", options, async () => {
  const harness = tinycastHarness("both", "view-usage");
  try {
    harness.setScenario("no-limits");
    harness.start();
    const tree = await harness.waitFor((tree) => markdown(tree).includes("No fixed plan limits are reported"));
    assert.ok(!markdown(tree).includes("% left"));
    assert.deepEqual(harness.failures, []);
  } finally {
    harness.stop();
  }
});

test("Tinycast's inline view can use the menu command's cached reading if its first fetch fails", options, async () => {
  const menu = tinycastHarness();
  const caches: Record<string, Record<string, string>> = {};
  try {
    menu.start();
    await menu.waitFor((tree) =>
      nodes(tree).some((node) => node.props?.title === "5h 71% · W 44%" && node.props?.isLoading === false),
    );
    for (const request of menu.requests.filter((request) => request.name === "cache.set")) {
      const [namespace, key, value] = request.args;
      assert.equal(typeof namespace, "string");
      assert.equal(typeof key, "string");
      assert.equal(typeof value, "string");
      (caches[namespace as string] ??= {})[key as string] = value as string;
    }
  } finally {
    menu.stop();
  }

  const view = tinycastHarness("both", "view-usage", caches);
  try {
    view.setScenario("usage-error");
    view.start();
    const tree = await view.waitFor((tree) => markdown(tree).includes("Last known usage"));
    assert.ok(markdown(tree).includes("71% left"));
    assert.ok(markdown(tree).includes("44% left"));
    assert.deepEqual(view.failures, []);
  } finally {
    view.stop();
  }
});
