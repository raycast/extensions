import { describe, expect, it } from "vitest";
import { missingScopes, OPERATIONS, parseScopes, satisfied, type Operation } from "./operations";

describe("OPERATIONS", () => {
  it("only self has an empty scope list", () => {
    for (const [name, op] of Object.entries(OPERATIONS)) {
      if (name === "self") expect(op.scopes).toHaveLength(0);
      else expect(op.scopes.length, name).toBeGreaterThan(0);
    }
  });
  it("tasks require user_management:read (verified live: 403 without it)", () => {
    expect(OPERATIONS.listTasks.scopes).toContain("user_management:read");
  });
  it("notes require record and object scopes on top of note:read", () => {
    expect(OPERATIONS.listNotes.scopes).toEqual(
      expect.arrayContaining(["note:read", "object_configuration:read", "record_permission:read"]),
    );
  });
  it("deleteTask needs ONLY task:read-write (verified asymmetry)", () => {
    expect(OPERATIONS.deleteTask.scopes).toEqual(["task:read-write"]);
  });
});

describe("satisfied", () => {
  it(":read-write satisfies :read (verified live 3x, spec §14)", () => {
    expect(satisfied(new Set(["note:read-write"]), "note:read")).toBe(true);
  });
  it(":read does not satisfy :read-write", () => {
    expect(satisfied(new Set(["task:read"]), "task:read-write")).toBe(false);
  });
  it("exact match satisfies", () => {
    expect(satisfied(new Set(["task:read"]), "task:read")).toBe(true);
  });
});

describe("missingScopes", () => {
  const readonlyToken = new Set(parseScopes("object_configuration:read record_permission:read"));
  it("mirrors the live probe: records ok, notes blocked", () => {
    expect(missingScopes(readonlyToken, "queryRecords")).toEqual([]);
    expect(missingScopes(readonlyToken, "listNotes")).toEqual(["note:read"]);
    expect(missingScopes(readonlyToken, "listTasks" satisfies Operation)).toEqual([
      "task:read",
      "user_management:read",
    ]);
  });
});

describe("parseScopes", () => {
  it("splits and keeps unknown scopes (granted set is descriptive, not a filter)", () => {
    expect(parseScopes("a:read b:read-write")).toEqual(["a:read", "b:read-write"]);
    expect(parseScopes(undefined)).toEqual([]);
    expect(parseScopes("  ")).toEqual([]);
  });
});
