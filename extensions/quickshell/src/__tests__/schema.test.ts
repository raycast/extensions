import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, createEmptyStoredData } from "../lib/schema";

describe("schema", () => {
  it("uses version 1", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it("creates empty stored data with defaults", () => {
    const data = createEmptyStoredData();
    expect(data.version).toBe(1);
    expect(data.workspaces).toEqual([]);
    expect(data.settings.terminalApplication).toBe("wt");
    expect(data.settings.recentWorkspaceCount).toBe(8);
  });
});
