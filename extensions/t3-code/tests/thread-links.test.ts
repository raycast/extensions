import assert from "node:assert/strict";
import test from "node:test";
import { threadDeepLink } from "../src/thread-links.ts";

const expected = "t3code://threads/environment-1/thread-1";
const link = (version: string | undefined) =>
  threadDeepLink("environment-1", "thread-1", version);

test("stable releases use thread links from 0.1.0", () => {
  assert.equal(link("0.0.46"), null);
  assert.equal(link("0.0.999"), null);
  for (const version of ["0.1.0", "0.1.7", "0.2.0", "1.0.0", "0.1.7+build.1"]) {
    assert.equal(link(version), expected, version);
  }
});

test("nightly releases respect the first supported build", () => {
  for (const version of [
    "0.0.45-nightly.20261013.1",
    "0.0.46-nightly.20261011.9999",
    "0.0.46-nightly.20261012.3009",
  ]) {
    assert.equal(link(version), null, version);
  }
  for (const version of [
    "0.0.46-nightly.20261012.3010",
    "0.0.46-nightly.20261012.3011",
    "0.0.46-nightly.20261013.1",
    "0.1.7-nightly.20261104.1",
  ]) {
    assert.equal(link(version), expected, version);
  }
});

test("unknown and malformed versions keep the legacy path", () => {
  for (const version of [
    undefined,
    "",
    "0.1",
    "v0.1.7",
    "0.01.7",
    "0.1.7-beta.1",
    "0.1.7-preview.20261104.1",
    "0.1.7-nightly.20261304.1",
    "0.1.7-nightly.20260230.1",
    "0.1.7-nightly.20261104.invalid",
    "0.1.7-nightly.20261104.9007199254740992",
    "9007199254740992.1.0",
  ]) {
    assert.equal(link(version), null, String(version));
  }
});

test("missing and blank IDs keep the legacy path", () => {
  for (const environmentId of [undefined, "", " \t"]) {
    assert.equal(threadDeepLink(environmentId, "thread-1", "0.1.7"), null);
  }
  for (const threadId of ["", " \n"]) {
    assert.equal(threadDeepLink("environment-1", threadId, "0.1.7"), null);
  }
});

test("does not construct links whose dot-only IDs would change the route", () => {
  for (const id of [".", ".."]) {
    assert.equal(threadDeepLink(id, "thread-1", "0.1.7"), null);
    assert.equal(threadDeepLink("environment-1", id, "0.1.7"), null);
  }
});

test("encodes environment and thread IDs as separate path segments", () => {
  assert.equal(
    threadDeepLink("環境 /?&%", "mcp:1/../?x=#%", "0.1.7"),
    "t3code://threads/%E7%92%B0%E5%A2%83%20%2F%3F%26%25/mcp%3A1%2F..%2F%3Fx%3D%23%25",
  );
});
