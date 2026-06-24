import { describe, expect, it } from "vitest";
import { parseStoredNodes, scopedStorageKey } from "./storage";

describe("workspace-scoped local preferences", () => {
  it("uses deterministic keys and isolates workspaces", () => {
    expect(scopedStorageKey("targetNodes", "one")).toBe("pinnedTargets:one");
    expect(scopedStorageKey("targetNodes", "two")).not.toBe(scopedStorageKey("targetNodes", "one"));
    expect(scopedStorageKey("supertags", " ")).toBe("supertagPreferences:legacy");
  });

  it("keeps valid legacy nodes without trusting malformed entries", () => {
    expect(parseStoredNodes('[{"id":"node","name":"Pinned"},{"id":4,"name":"bad"}]')).toEqual([
      { id: "node", name: "Pinned" },
    ]);
    expect(parseStoredNodes("not-json")).toEqual([]);
    expect(parseStoredNodes('{"id":"node"}')).toEqual([]);
  });
});
