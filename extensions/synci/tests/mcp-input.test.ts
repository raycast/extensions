import { describe, expect, it } from "vitest";
import { mcpArguments } from "../src/lib/mcp-input";

describe("MCP tool inputs", () => {
  it("preserves opaque cursors, exact ID strings, and explicit false values", () => {
    const input = { account_id: "967606481327471", cursor: "opaque+/==", verbose: false, limit: 100 };
    expect(mcpArguments("list_transactions", input)).toEqual(input);
  });
  it("accepts leap days and drops optional undefined properties", () => {
    expect(mcpArguments("list_transactions", { from: "2024-02-29", to: "2024-03-01", cursor: undefined })).toEqual({
      from: "2024-02-29",
      to: "2024-03-01",
    });
  });
  it.each([
    { from: "2026-02-29" },
    { to: "2026-09-31" },
    { from: "2026-9-01" },
    { from: "2026-10-01", to: "2026-09-30" },
    { limit: 0 },
    { limit: 1.5 },
    { limit: "50" },
    { status: "settled" },
    { date_field: "created" },
    { verbose: "true" },
    { account_id: 42 },
    { account_id: "../accounts" },
    { search: "coffee" },
    { cursor: "" },
    null,
    [],
  ])("rejects invalid transaction input %j", (input) => {
    expect(() => mcpArguments("list_transactions", input)).toThrow();
  });
  it("requires an account for balance snapshots and prevents arguments leaking to other tools", () => {
    expect(() => mcpArguments("get_account_balance", {})).toThrow("account_id is required");
    expect(() => mcpArguments("list_connections", { verbose: true })).toThrow("Unsupported");
    expect(() => mcpArguments("list_accounts", { account_category: "CRYPTO" })).toThrow("BANK, INVESTMENT");
  });
});
