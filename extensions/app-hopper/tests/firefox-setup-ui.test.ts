import type { MockValue } from "./load-ts.ts";
import assert from "node:assert/strict";
import test from "node:test";
import createLoader from "./load-ts.ts";

function find(node: MockValue, title: string): MockValue {
  if (Array.isArray(node)) return node.map((child) => find(child, title)).find(Boolean);
  if (!node || typeof node !== "object") return;
  if (node.props?.title === title) return node;
  return find(node.props?.children, title) || find(node.props?.actions, title);
}

function setup(
  release: { version: string; xpiUrl: string; sha256: string } | null,
  browserId: "firefox" | "zen" = "firefox",
) {
  const targets: string[] = [];
  const steps: string[][] = [];
  const state = { installed: false, registered: false, connected: false, versions: [] as string[], release };
  const toast = { title: "", message: "", style: "" };
  const busy = { current: false };
  const options = { confirm: true, downloadFailure: false };
  const load = createLoader({
    "@raycast/api": {
      Action: Object.assign(() => {}, { Push: () => {}, Style: { Destructive: "destructive" } }),
      ActionPanel: () => {},
      Detail: () => {},
      Icon: {},
      Alert: { ActionStyle: { Destructive: "destructive" } },
      Keyboard: { Shortcut: { Common: {} } },
      Toast: { Style: { Animated: "animated", Success: "success", Failure: "failure" } },
      confirmAlert: async () => options.confirm,
      showToast: async () => toast,
      open: async (target, application) => steps.push(["open", target, application]),
    },
    "@raycast/utils": {
      useCachedPromise: () => ({
        data: state,
        revalidate: () => {
          steps.push(["refresh"]);
        },
      }),
    },
    react: { useState: () => [false, () => {}], useRef: () => busy },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "./browsers/firefox": {
      disconnectFirefoxBridges: async () => {
        steps.push(["stop"]);
        state.connected = false;
      },
    },
    "./browsers/firefox-companion": {
      getFirefoxCompanionRelease: async () => release,
      downloadFirefoxCompanion: async (_release, _fetch, id) => {
        targets.push(id);
        steps.push(["download"]);
        if (options.downloadFailure) throw new Error("Checksum mismatch");
        return "/private/companion.xpi";
      },
      hasFirefoxCompanionUpdate: (versions) => versions.includes("0.9.0"),
    },
    "./browsers/firefox-integration": {
      installFirefoxHost: async (id) => {
        targets.push(id);
        steps.push(["install"]);
        state.installed = true;
      },
      removeFirefoxHost: async (disconnect) => {
        steps.push(["remove"]);
        await disconnect();
        state.installed = false;
      },
    },
  });
  const { FirefoxIntegrationView } = load("src/firefox-integration.tsx");
  return { render: () => FirefoxIntegrationView({ browserId }), state, steps, options, toast, busy, targets };
}

const release = { version: "1.0.0", xpiUrl: "https://example.com/signed.xpi", sha256: "a".repeat(64) };

test("Firefox setup downloads a verified XPI before installing the helper and opening Firefox, then offers updates", async () => {
  const { render, state, steps, toast, options, busy } = setup(release);
  await find(render(), "Enable Firefox Integration").props.onAction();
  assert.deepEqual(steps, [
    ["download"],
    ["install"],
    ["open", "/private/companion.xpi", "org.mozilla.firefox"],
    ["refresh"],
  ]);
  assert.equal(toast.title, "Confirm installation in Firefox");
  assert.match(render().props.markdown, /Click the companion's toolbar button/);
  state.connected = true;
  state.versions = ["0.9.0"];
  assert.match(render().props.markdown, /Companion 1.0.0 is available. Choose Update Firefox Companion/);
  assert(find(render(), "Update Firefox Companion"));
  state.versions = ["1.0.0"];
  assert(find(render(), "Reinstall Firefox Companion"));
  steps.length = 0;
  options.downloadFailure = true;
  await find(render(), "Reinstall Firefox Companion").props.onAction();
  assert.deepEqual(steps, [["download"], ["refresh"]]);
  assert.equal(toast.style, "failure");
  assert.equal(busy.current, false);
  steps.length = 0;
  await find(render(), "Repair Local Helper").props.onAction();
  assert.deepEqual(steps, [["install"], ["refresh"]], "repair should not redownload or reinstall the companion");
  steps.length = 0;
  await find(render(), "Manage Firefox Companion").props.onAction();
  assert.deepEqual(steps, [["open", "about:addons", "org.mozilla.firefox"]]);
});

test("unconfigured signed download never claims installation is ready or exposes a broken install action", () => {
  const { render, state } = setup(null);
  assert.match(render().props.markdown, /signed companion download is not available/);
  assert.equal(find(render(), "Enable Firefox Integration"), undefined);
  assert.equal(find(render(), "Repair Local Helper"), undefined);
  state.registered = true;
  assert(find(render(), "Repair Local Helper"));
  assert.match(render().props.markdown, /needs repair/);
  state.installed = true;
  assert(find(render(), "Repair Local Helper"));
  assert.match(render().props.markdown, /Click the companion's toolbar button/);
  assert.doesNotMatch(render().props.markdown, /download is not available/);
  state.connected = true;
  state.versions = ["1.0.0"];
  assert.equal(render().props.markdown, "# Firefox Integration\n\nConnected — companion 1.0.0.");
  assert(find(render(), "Check Connection"));
  assert(find(render(), "Repair Local Helper"));
  state.installed = false;
  assert.match(render().props.markdown, /Repair the local helper before restarting Firefox/);
});

test("removal can be canceled, otherwise stops local integration and explains separate companion removal", async () => {
  const { render, state, steps, options, toast } = setup(release);
  state.installed = state.connected = true;
  options.confirm = false;
  await find(render(), "Remove Local Integration").props.onAction();
  assert.deepEqual(steps, []);
  options.confirm = true;
  await find(render(), "Remove Local Integration").props.onAction();
  assert.deepEqual(steps, [["remove"], ["stop"], ["refresh"]]);
  assert.equal(toast.title, "Local integration removed");
  assert.match(toast.message, /remove the companion from Firefox/);
  assert.match(render().props.markdown, /Not enabled/);
});

test("Zen setup opens the shared companion in Zen and exposes helper preparation without a signed release", async () => {
  const enabled = setup(release, "zen");
  await find(enabled.render(), "Enable Zen Integration").props.onAction();
  assert.deepEqual(enabled.targets, ["zen", "zen"]);
  assert(enabled.steps.some((step) => step[0] === "open" && step[2] === "app.zen-browser.zen"));
  assert.equal(enabled.toast.title, "Confirm installation in Zen");
  assert.match(enabled.render().props.markdown, /^# Zen Integration/);
  assert.equal(find(enabled.render(), "Enable Firefox Integration"), undefined);
  const unavailable = setup(null, "zen");
  assert.equal(find(unavailable.render(), "Enable Zen Integration"), undefined);
  await find(unavailable.render(), "Prepare Local Helper").props.onAction();
  assert.deepEqual(unavailable.targets, ["zen"]);
});
