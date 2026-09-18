import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allGranted, mergePermissions, samePermissions, type Permissions } from "../src/lib/permissions";

const both: Permissions = { fullDisk: "granted", appManagement: "granted" };

describe("mergePermissions", () => {
  it("keeps a known answer when the next reading could not be taken", () => {
    const hiccup: Permissions = { fullDisk: "unknown", appManagement: "unknown" };
    assert.deepEqual(mergePermissions(both, hiccup), both);
  });

  it("still reports a real revocation", () => {
    const revoked: Permissions = { fullDisk: "granted", appManagement: "denied" };
    assert.equal(mergePermissions(both, revoked).appManagement, "denied");
  });

  it("accepts the first reading as-is", () => {
    assert.deepEqual(mergePermissions(null, both), both);
  });

  it("merges each permission independently", () => {
    const partial: Permissions = { fullDisk: "denied", appManagement: "unknown" };
    assert.deepEqual(mergePermissions(both, partial), { fullDisk: "denied", appManagement: "granted" });
  });
});

describe("samePermissions", () => {
  it("treats identical readings as equal, so no re-render is triggered", () => {
    assert.equal(samePermissions(both, { ...both }), true);
  });

  it("detects a change", () => {
    assert.equal(samePermissions(both, { ...both, fullDisk: "denied" }), false);
  });

  it("handles the initial null state", () => {
    assert.equal(samePermissions(null, both), false);
    assert.equal(samePermissions(null, null), true);
  });
});

describe("allGranted", () => {
  it("requires both", () => {
    assert.equal(allGranted(both), true);
    assert.equal(allGranted({ fullDisk: "granted", appManagement: "unknown" }), false);
    assert.equal(allGranted({ fullDisk: "denied", appManagement: "granted" }), false);
  });
});
