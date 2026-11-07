import { describe, expect, it } from "vitest";
import { accountKey } from "../src/helpers/keys";
import { isSameScope, parseSharedResult, ResultScope, sharedResultKey } from "../src/helpers/my-work-items";

const accountA: ResultScope = {
  basePath: "https://api.plane.so",
  workspaceSlug: "acme",
  account: accountKey("plane_api_account_a"),
};
const accountB: ResultScope = { ...accountA, account: accountKey("plane_api_account_b") };
const otherWorkspace: ResultScope = { ...accountA, workspaceSlug: "beta" };

function stored(scope: ResultScope | undefined, view = "assigned") {
  return JSON.stringify({ view, items: [{ id: "1" }], scope });
}

describe("shared My Work Items results", () => {
  it("keys results by server, workspace, account and view", () => {
    expect(sharedResultKey(accountA, "assigned")).not.toBe(sharedResultKey(accountB, "assigned"));
    expect(sharedResultKey(accountA, "assigned")).not.toBe(sharedResultKey(otherWorkspace, "assigned"));
    expect(sharedResultKey(accountA, "assigned")).not.toBe(sharedResultKey(accountA, "created"));
  });

  it("never puts the token in the key", () => {
    expect(accountKey("plane_api_account_a")).toMatch(/^[0-9a-f]{16}$/);
    expect(sharedResultKey(accountA, "assigned")).not.toContain("plane_api_account_a");
  });

  it("returns a result only for the scope and view that fetched it", () => {
    expect(parseSharedResult(stored(accountA), accountA, "assigned")).toMatchObject({ view: "assigned" });
    expect(parseSharedResult(stored(accountA), accountB, "assigned")).toBeUndefined();
    expect(parseSharedResult(stored(accountA), otherWorkspace, "assigned")).toBeUndefined();
    expect(parseSharedResult(stored(accountA, "created"), accountA, "assigned")).toBeUndefined();
  });

  it("ignores results without a scope and unreadable entries", () => {
    expect(parseSharedResult(stored(undefined), accountA, "assigned")).toBeUndefined();
    expect(parseSharedResult("{not json", accountA, "assigned")).toBeUndefined();
    expect(parseSharedResult(undefined, accountA, "assigned")).toBeUndefined();
  });

  it("compares scopes field by field", () => {
    expect(isSameScope(accountA, { ...accountA })).toBe(true);
    expect(isSameScope(accountA, accountB)).toBe(false);
    expect(isSameScope(accountA, otherWorkspace)).toBe(false);
    expect(isSameScope(accountA, undefined)).toBe(false);
  });
});
