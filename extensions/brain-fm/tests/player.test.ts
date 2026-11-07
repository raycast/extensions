import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { parseHTML } from "linkedom";
import { buildBrowserScript, parseBrowserResponse } from "../src/lib/browser-script";
import {
  buildPlayerScript,
  didTrackChange,
  explicitPlaybackAction,
  PlaybackAction,
  PlayerSnapshot,
} from "../src/lib/player-script";
import { controlWithReader } from "../src/lib/verify-control";

function playerFixture(
  options: {
    label?: string;
    disabled?: boolean;
    mobile?: boolean;
    origin?: string;
    previousDisabled?: boolean;
    noPlayer?: boolean;
  } = {},
) {
  const suffix = options.mobile ? "-mobile" : "";
  const { document } = parseHTML(`<html><body>
    ${options.noPlayer ? "" : `<button data-testid="playPauseButton${suffix}" aria-label="${options.label || "Pause"}" ${options.disabled ? 'disabled aria-disabled="true"' : ""}></button>`}
    <button data-testid="skipButton${suffix}" aria-label="Skip track"></button>
    <button data-testid="previousButton${suffix}" aria-label="Previous track" aria-disabled="${Boolean(options.previousDisabled)}"></button>
    <div data-testid="currentTrackTitle${suffix}">first track<span data-testid="newLabel${suffix}">NEW</span></div>
    <p data-testid="timerDisplay">00:42</p>
    <audio></audio>
  </body></html>`);
  for (const element of Array.from(document.querySelectorAll("*"))) {
    Object.defineProperty(element, "getClientRects", { value: () => [{ width: 100, height: 20 }] });
  }
  const playButton = document.querySelector(`[data-testid="playPauseButton${suffix}"]`);
  const audio = document.querySelector("audio")!;
  Object.defineProperty(audio, "currentSrc", {
    value: "https://stream.example.test/one?token=private",
    writable: true,
  });
  let clicks = 0;
  playButton?.addEventListener("click", () => {
    clicks++;
    playButton.setAttribute("aria-label", playButton.getAttribute("aria-label") === "Pause" ? "Play" : "Pause");
  });
  document.querySelector(`[data-testid="skipButton${suffix}"]`)!.addEventListener("click", () => {
    clicks++;
    document.querySelector(`[data-testid="currentTrackTitle${suffix}"]`)!.textContent = "second track";
    Object.defineProperty(audio, "currentSrc", { value: "https://stream.example.test/two?token=private" });
  });
  const mediaSession = {
    playbackState: "none",
    metadata: { title: "first track" },
    setActionHandler: () => assert.fail("Vendor handlers must not be replaced"),
  };
  const context = vm.createContext({
    document,
    URL,
    navigator: { mediaSession },
    location: { origin: options.origin || "https://my.brain.fm" },
    getComputedStyle: () => ({ visibility: "visible", display: "block" }),
  });
  return {
    run: (action: PlaybackAction) => JSON.parse(vm.runInContext(buildPlayerScript(action), context)) as PlayerSnapshot,
    clicks: () => clicks,
    mediaSession,
    removeBadge: () => document.querySelector(`[data-testid="newLabel${suffix}"]`)?.remove(),
    renewSource: (source: string) => Object.defineProperty(audio, "currentSrc", { value: source }),
    removeTitle: () => {
      document.querySelector(`[data-testid="currentTrackTitle${suffix}"]`)?.remove();
      mediaSession.metadata.title = "";
    },
  };
}

test("reads current UI and media-session state without changing playback or exposing stream tokens", () => {
  const fixture = playerFixture();
  const state = fixture.run("status");
  assert.equal(state.title, "first track");
  assert.equal(state.timer, "00:42");
  assert.equal(state.state, "playing");
  assert.equal(state.mediaSession.playbackState, "none");
  assert.equal(fixture.clicks(), 0);
  assert.ok(!JSON.stringify(state).includes("private"));
  assert.ok(!JSON.stringify(state).includes("https://stream"));
});

test("play and pause are idempotent; toggle changes the expected state once", () => {
  const fixture = playerFixture();
  assert.equal(fixture.run("play").clicked, false);
  assert.equal(fixture.run("pause").expectedState, "paused");
  assert.equal(fixture.run("status").state, "paused");
  assert.equal(fixture.run("pause").clicked, false);
  assert.equal(fixture.run("toggle").expectedState, "playing");
  assert.equal(fixture.run("status").state, "playing");
  assert.equal(fixture.clicks(), 2);
});

test("skip verifies a new track and leaves native media-session handlers intact", () => {
  const fixture = playerFixture();
  const before = fixture.run("skip");
  const after = fixture.run("status");
  assert.equal(before.clicked, true);
  assert.equal(after.title, "second track");
  assert.ok(didTrackChange(before, after));
  assert.equal(fixture.mediaSession.playbackState, "none");
  assert.equal(fixture.mediaSession.metadata.title, "first track");
});

test("supports mobile controls without relying on display text or CSS class names", () => {
  const fixture = playerFixture({ mobile: true, label: "Play" });
  assert.equal(fixture.run("play").clicked, true);
  assert.equal(fixture.run("status").state, "playing");
});

test("loading, missing controls, disabled previous, and another origin fail without clicking", () => {
  for (const [options, action] of [
    [{ disabled: true }, "play"],
    [{ noPlayer: true }, "toggle"],
    [{ previousDisabled: true }, "previous"],
    [{ origin: "https://my.brain.fm.attacker.test" }, "skip"],
  ] as const) {
    const fixture = playerFixture(options);
    assert.ok(fixture.run(action).error);
    assert.equal(fixture.clicks(), 0);
  }
});

test("a loading state and unchanged track cannot be reported as a verified skip", () => {
  const before = playerFixture().run("status");
  assert.equal(didTrackChange(before, { ...before }), false);
  assert.equal(didTrackChange(before, { ...before, title: "new title", state: "loading" }), false);
  assert.equal(didTrackChange(before, { ...before, sourceFingerprint: "different" }), false);
  assert.equal(
    didTrackChange({ ...before, title: "" }, { ...before, title: "", sourceFingerprint: "different" }),
    true,
  );
});

test("browser adapter rejects ambiguity and limits execution to official player tabs", () => {
  for (const browser of ["dia", "chrome"] as const) {
    const script = buildBrowserScript(browser);
    assert.ok(script.includes("https://my.brain.fm/player"));
    assert.ok(script.includes("greater than 1 then error"));
    assert.ok(script.includes("set jsonResponse to execute playerTab javascript jsText"));
    assert.ok(script.includes('requiredTabId is "" or tabId is requiredTabId'));
    assert.ok(!script.includes("activate"));
    assert.ok(!script.includes("System Events"));
  }
});

test("mobile and desktop badge removal cannot masquerade as a different track", () => {
  for (const mobile of [false, true]) {
    const fixture = playerFixture({ mobile });
    const before = fixture.run("status");
    fixture.removeBadge();
    const after = fixture.run("status");
    assert.equal(before.title, "first track");
    assert.equal(after.title, "first track");
    assert.equal(didTrackChange(before, after), false);
  }
});

test("a stale displayed Play or Pause action remains explicit and idempotent", () => {
  for (const label of ["Play", "Pause"]) {
    const fixture = playerFixture({ label });
    const displayed = fixture.run("status");
    const action = explicitPlaybackAction(displayed.state);
    fixture.run("toggle"); // The user changed playback through another control.
    const result = fixture.run(action);
    assert.equal(result.clicked, false);
    assert.equal(result.state, action === "pause" ? "paused" : "playing");
    assert.equal(fixture.clicks(), 1);
  }
});

test("signed query and fragment renewal is not a new track; stable path is a fallback only", () => {
  const fixture = playerFixture();
  const before = fixture.run("status");
  fixture.renewSource("https://stream.example.test/one?token=renewed#new-fragment");
  const renewed = fixture.run("status");
  assert.equal(renewed.sourceFingerprint, before.sourceFingerprint);
  assert.equal(didTrackChange(before, renewed), false);
  fixture.renewSource("https://stream.example.test/two?token=renewed");
  assert.equal(didTrackChange(before, fixture.run("status")), false); // Same visible title is authoritative.
  fixture.removeTitle();
  const withoutTitle = fixture.run("status");
  fixture.renewSource("https://stream.example.test/three?token=renewed");
  assert.equal(didTrackChange(withoutTitle, fixture.run("status")), true);
});

test("browser response requires the retained browser and tab identity", () => {
  const snapshot = playerFixture().run("status");
  const response = `original-tab\n${JSON.stringify(snapshot)}`;
  const target = { browser: "dia" as const, tabId: "original-tab" };
  assert.equal(parseBrowserResponse(response, "dia", target).tabId, "original-tab");
  assert.throws(
    () => parseBrowserResponse(`replacement-tab\n${JSON.stringify(snapshot)}`, "dia", target),
    /original.*tab/,
  );
  assert.throws(() => parseBrowserResponse(response, "chrome", target), /original.*tab/);
});

test("verification pins the clicked target and rejects a replacement tab", async () => {
  const fixture = playerFixture();
  const before = { ...fixture.run("pause"), browser: "dia" as const, tabId: "original-tab" };
  let calls = 0;
  await assert.rejects(
    controlWithReader("pause", async (action, target) => {
      calls++;
      if (action === "pause") return before;
      assert.deepEqual(target, { browser: "dia", tabId: "original-tab" });
      return { ...fixture.run("status"), browser: "dia", tabId: "replacement-tab" };
    }),
    /original.*tab.*changed/,
  );
  assert.equal(calls, 2);
});

test("Now Playing's displayed target is retained before the initial control call", async () => {
  const fixture = playerFixture();
  const displayed = { browser: "dia" as const, tabId: "displayed-tab" };
  let calls = 0;
  const result = await controlWithReader(
    "play",
    async (action, target) => {
      calls++;
      assert.deepEqual(target, displayed);
      return { ...fixture.run(action), ...displayed };
    },
    displayed,
  );
  assert.equal(result.state, "playing");
  assert.equal(calls, 1);
  await assert.rejects(
    controlWithReader(
      "play",
      async () => ({ ...fixture.run("status"), browser: "dia", tabId: "replacement-tab" }),
      displayed,
    ),
    /original.*tab.*changed/,
  );
});
