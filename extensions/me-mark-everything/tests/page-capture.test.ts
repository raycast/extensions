import test from "node:test";
import assert from "node:assert/strict";
import { createPageReader, identifyBrowser, parsePage, browsers, pageReadFailure } from "../src/page-capture";

test("optional bundle identity uses exact known names, never an unrelated running browser", () => {
  assert.equal(identifyBrowser({ name: "Google Chrome" }).bundleId, "com.google.Chrome");
  assert.equal(identifyBrowser({ name: "Arc.app" }).name, "Arc");
  assert.equal(identifyBrowser({ name: "localized", bundleId: "com.microsoft.edgemac" }).name, "Microsoft Edge");
  assert.throws(() => identifyBrowser({ name: "Finder", bundleId: "com.apple.finder" }), /Started from Finder/);
  assert.throws(() => identifyBrowser({ name: "Google Chrome", bundleId: "not.chrome" }));
});
test("structured URL/title capture preserves Unicode, commas, quotes and newlines; rejects internal URLs", () => {
  const title = '中文, “title” "quoted"\nsecond line';
  assert.deepEqual(parsePage(JSON.stringify({ url: "https://example.org/a?q=x,y", title }), browsers[0]), {
    url: "https://example.org/a?q=x,y",
    title,
    browser: "Google Chrome",
  });
  assert.throws(
    () => parsePage(JSON.stringify({ url: "chrome://settings", title: "Settings" }), browsers[0]),
    /internal/,
  );
  assert.throws(
    () => parsePage(JSON.stringify({ url: "https://example.org/", title: 42 }), browsers[0]),
    /Could not read/,
  );
});
test("a failed read retries the original browser even after the foreground application changes", async () => {
  let originCalls = 0,
    reads = 0;
  let foreground = { name: "Google Chrome", bundleId: "com.google.Chrome" };
  const reader = createPageReader(
    async () => {
      originCalls++;
      return { ...foreground };
    },
    async (browser) => {
      assert.equal(browser.bundleId, "com.google.Chrome");
      if (reads++ === 0) throw Error("Automation permission pending");
      return {
        url: "https://example.org/",
        title: "Example",
        browser: browser.name,
      };
    },
  );
  await assert.rejects(reader.read(), /permission/);
  foreground = { name: "Raycast", bundleId: "com.raycast.macos" };
  assert.equal((await reader.read()).title, "Example");
  assert.equal(originCalls, 1);
});
test("automatic read and retry coalesce instead of starting two permission requests", async () => {
  let release!: () => void,
    calls = 0;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const reader = createPageReader(
    async () => ({ name: "Arc" }),
    async (b) => {
      calls++;
      await gate;
      return { url: "https://example.org/", title: "Test", browser: b.name };
    },
  );
  const first = reader.read(),
    second = reader.read();
  assert.equal(first, second);
  release();
  await Promise.all([first, second]);
  assert.equal(calls, 1);
});

test("cancel before origin lookup completes prevents a late browser permission request", async () => {
  let release!: (app: { name: string }) => void,
    calls = 0;
  const origin = new Promise<{ name: string }>((r) => {
    release = r;
  });
  const reader = createPageReader(
    () => origin,
    async (b) => {
      calls++;
      return { url: "https://example.org/", title: "Test", browser: b.name };
    },
  );
  const first = reader.read();
  reader.cancel();
  release({ name: "Arc" });
  await assert.rejects(first, /cancelled/);
  assert.equal(calls, 0);
  assert.equal((await reader.read()).browser, "Arc");
  assert.equal(calls, 1);
});

test("SDK rejections become actionable permission or timeout errors without exposing raw diagnostics", () => {
  assert.match(
    pageReadFailure(
      {
        timedOut: true,
        message: "Command timed out after 20000 milliseconds: osascript",
      },
      browsers[1],
    ).message,
    /Microsoft Edge did not respond.*paste a URL/,
  );
  assert.match(
    pageReadFailure(
      {
        stderr: "execution error: Not authorized to send Apple events (-1743)",
      },
      browsers[2],
    ).message,
    /Allow Raycast to control Arc.*Manual entry/,
  );
  assert.match(
    pageReadFailure(new Error("AppleEvent timed out (-1712)"), browsers[0]).message,
    /Google Chrome did not respond/,
  );
  assert.match(pageReadFailure({ name: "AbortError" }, browsers[0]).message, /cancelled/);
  const failure = pageReadFailure(new Error("unexpected private diagnostic https://private.invalid"), browsers[0]);
  assert.match(failure.message, /Could not read Google Chrome/);
  assert.doesNotMatch(failure.message, /private/);
});
