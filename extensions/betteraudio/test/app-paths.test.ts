import test from "node:test";
import assert from "node:assert/strict";
import { buildAppPathMap, getAppPath } from "../src/lib/app-paths.ts";
import type { Application } from "@raycast/api";

function app(input: Partial<Application>): Application {
  return {
    name: input.name || "Test App",
    path: input.path || `/Applications/${input.name || "Test App"}.app`,
    bundleId: input.bundleId,
  };
}

test("builds a bundle ID to path map from applications", () => {
  const paths = buildAppPathMap([
    app({ name: "Safari", bundleId: "com.apple.Safari" }),
    app({ name: "NoBundle" }),
  ]);
  assert.equal(paths["com.apple.Safari"], "/Applications/Safari.app");
  assert.equal(Object.keys(paths).length, 1);
});

test("map survives the JSON round-trip useCachedPromise cache performs", () => {
  // useCachedPromise stores its data in LocalStorage (JSON); a Map would
  // deserialize as {} and crash callers of .get(). A plain record round-trips.
  const paths = buildAppPathMap([
    app({ name: "Safari", bundleId: "com.apple.Safari" }),
  ]);
  const cached = JSON.parse(JSON.stringify(paths));
  assert.equal(getAppPath(cached, "com.apple.Safari"), "/Applications/Safari.app");
});

test("getAppPath returns undefined for missing bundle IDs or maps", () => {
  assert.equal(getAppPath(undefined, "com.apple.Safari"), undefined);
  assert.equal(getAppPath({}, undefined), undefined);
  assert.equal(getAppPath({}, "com.apple.Safari"), undefined);
});
