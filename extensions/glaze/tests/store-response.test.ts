import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseStoreApps,
  parseStoreOrganizations,
} from "../src/lib/store-response";

test("store pages retain continuation even when a page is empty", () => {
  assert.deepEqual(parseStoreApps({ apps: [], hasMore: true }), {
    data: [],
    hasMore: true,
  });
  assert.deepEqual(parseStoreApps({ apps: [], hasMore: false }), {
    data: [],
    hasMore: false,
  });
});

test("store metadata is checked before reaching Raycast views", () => {
  const app = {
    id: "id",
    public_id: "public",
    display_name: "Timer",
    profiles: { username: "alex", display_name: null },
  };
  assert.deepEqual(parseStoreApps({ apps: [app], hasMore: false }).data, [app]);
  for (const value of [
    null,
    {},
    { apps: [], hasMore: "true" },
    { apps: [null], hasMore: false },
    { apps: [{ ...app, description: {} }], hasMore: false },
    { apps: [{ ...app, profiles: { username: 123 } }], hasMore: false },
  ]) {
    assert.throws(
      () => parseStoreApps(value),
      /Unexpected Glaze Store response/,
    );
  }
});

test("team stores exclude inaccessible or invalid organizations and sort by name", () => {
  const alpha = {
    id: "a",
    name: "Alpha",
    slug: "alpha",
    teamStoreAccess: { canInstallFromStore: true },
  };
  const beta = { id: "b", name: "Beta", slug: "beta" };
  assert.deepEqual(
    parseStoreOrganizations({
      organizations: [
        beta,
        null,
        { id: "bad", name: {} },
        {
          ...alpha,
          id: "denied",
          teamStoreAccess: { canInstallFromStore: false },
        },
        alpha,
      ],
    }),
    [alpha, beta],
  );
  assert.throws(
    () => parseStoreOrganizations(null),
    /Unexpected Glaze account response/,
  );
});
