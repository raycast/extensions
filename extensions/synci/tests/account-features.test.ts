import { describe, expect, it, vi } from "vitest";
import { accountDetails, accountDetailsText } from "../src/lib/account-details";
import { SynciClient } from "../src/lib/api-client";
import { categoryMatches, categoryOptions, transactionCategory } from "../src/lib/categories";
import { errorDiagnostics, SynciApiError } from "../src/lib/diagnostics";
import { spendingSummary } from "../src/lib/finance";
import { menuBarSummary } from "../src/lib/menu-bar";
import { SignInRequiredError } from "../src/lib/oauth-session";
import type { FinancialAccount, Transaction } from "../src/lib/types";

const account = (id: number, currency = "NOK", amount = "10.10"): FinancialAccount => ({
  id,
  enabled: true,
  currency,
  name: `Account ${id}`,
  balance: { cleared: amount },
});
const transaction = (id: number, category?: string, amount = "-10.10", currency = "NOK"): Transaction => ({
  id,
  financial_account_id: 1,
  booked: true,
  amount,
  currency,
  enriched: { category_general: category },
});
const page = (data: Transaction[], current: number, last: number) =>
  Response.json({ data, meta: { current_page: current, last_page: last }, links: {} });

describe("account details", () => {
  it("loads only the linked account's summary without fetching sensitive identifiers or other accounts", async () => {
    const data = account(42);
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data }));
    expect(await new SynciClient(async () => "token", transport).accountSummary(42)).toEqual(data);
    expect(transport).toHaveBeenCalledOnce();
    const url = new URL(String(transport.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/v1/finance/accounts/42");
    expect(url.searchParams.get("omit_sensitive_identifiers")).toBe("1");
    expect(url.searchParams.get("include")).toBe("financial_connection.institution");
  });
  it.each([NaN, 0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid linked account ID %s before making a request",
    async (id) => {
      const transport = vi.fn<typeof fetch>();
      await expect(new SynciClient(async () => "token", transport).accountSummary(id)).rejects.toThrow(
        "link is invalid",
      );
      expect(transport).not.toHaveBeenCalled();
    },
  );
  it("rejects a mismatched linked account instead of showing another account", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: account(2) }));
    await expect(new SynciClient(async () => "token", transport).accountSummary(1)).rejects.toThrow(
      "unexpected account details",
    );
  });
  it("includes available identifiers without inventing missing fields or unmasking account numbers", () => {
    const data = {
      ...account(1),
      iban: "DE00000000000000000000",
      owner_name: "Demo Owner",
      bic: "",
      account_number_masked: "****1234",
    };
    expect(accountDetails(data)).toContainEqual(["IBAN", data.iban]);
    expect(accountDetails(data)).not.toContainEqual(["BIC / SWIFT", ""]);
    expect(accountDetailsText(data)).toContain("Masked Account Number: ****1234");
    expect(accountDetailsText(data)).not.toContain("Account Number (BBAN)");
  });
  it("fetches identifiers only for the explicitly opened account", async () => {
    const data = { ...account(42), bban: "00000000000" };
    const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data }));
    expect(await new SynciClient(async () => "test-token", transport).accountDetails(42)).toEqual(data);
    const url = new URL(String(transport.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/v1/finance/accounts/42");
    expect(url.searchParams.get("omit_sensitive_identifiers")).toBe("0");
    expect(transport.mock.calls[0][1]?.redirect).toBe("error");
  });
  it("rejects details for the wrong account and malformed payloads", async () => {
    for (const payload of [{ data: account(2) }, { data: [] }, null]) {
      const transport = vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload));
      await expect(new SynciClient(async () => "token", transport).accountDetails(1)).rejects.toThrow(
        "unexpected account details",
      );
    }
  });
});

describe("enrichment categories", () => {
  it("treats missing/blank categories as uncategorized and matches exact names without case sensitivity", () => {
    expect(transactionCategory(transaction(1, "  "))).toBeUndefined();
    expect(categoryMatches(transaction(1, "Groceries"), "groceries")).toBe(true);
    expect(categoryMatches(transaction(1, "Groceries"), "groc")).toBe(false);
    expect(categoryMatches(transaction(1), "")).toBe(true);
    expect(categoryOptions([transaction(1, "groceries"), transaction(2, "Groceries"), transaction(3)])).toHaveLength(1);
  });
  it("scans beyond non-matching pages, retains server filters, and resumes from the next page", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page([transaction(1, "Transport")], 1, 3))
      .mockResolvedValueOnce(page([transaction(2, "Groceries"), transaction(3, "Transport")], 2, 3));
    const result = await new SynciClient(async () => "token", transport).transactionBatch(
      { category: "groceries", accountId: "1", search: "Market", period: "month" },
      1,
    );
    expect(result).toEqual({ data: [transaction(2, "Groceries")], hasMore: true, cursor: 3 });
    for (const [input] of transport.mock.calls) {
      const params = new URL(String(input)).searchParams;
      expect(params.get("filter[financial_account_id]")).toBe("1");
      expect(params.get("filter[search]")).toBe("Market");
      expect(params.has("filter[booking_date_after]")).toBe(true);
      expect(params.has("filter[category]")).toBe(false);
    }
  });
  it("combines categories with exact amount searches and supports uncategorized searches", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        page(
          [
            transaction(1, "Food", "-20"),
            transaction(2, "Travel", "-20"),
            transaction(3, "Food", "-30"),
            transaction(4, undefined, "-20"),
          ],
          1,
          1,
        ),
      );
    const client = new SynciClient(async () => "token", transport);
    expect((await client.transactionBatch({ search: "20", category: "Food" }, 1)).data.map(({ id }) => id)).toEqual([
      1,
    ]);
    expect((await client.transactionBatch({ category: "" }, 1)).data.map(({ id }) => id)).toEqual([4]);
  });
  it("reports the scan limit instead of claiming no matching category exists", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        page([], Number(new URL(String(input)).searchParams.get("page[number]")), 101),
      );
    await expect(
      new SynciClient(async () => "token", transport).transactionBatch({ category: "Food" }, 1),
    ).rejects.toThrow("Category search scanned 10,000 records");
  });
  it("keeps category totals exact and currencies separate, including uncategorized spending", () => {
    const rows = [
      transaction(1, "Food", "-0.10"),
      transaction(2, "food", "-0.20"),
      transaction(3),
      transaction(4, "Food", "-5", "EUR"),
      transaction(5, "Food", "10"),
      { ...transaction(6, "Food"), booked: false },
    ];
    const summary = spendingSummary([...rows, rows[0]], "category");
    const nok = summary.currencies.find(([code]) => code === "NOK")![1];
    expect(nok.amount.toString()).toBe("10.4");
    expect(nok.groups.size).toBe(2);
    expect([...nok.groups.values()].map((group) => group.amount.toString()).sort()).toEqual(["0.3", "10.1"]);
    expect(summary.currencies).toHaveLength(2);
  });
});

describe("menu bar selection", () => {
  it("only totals selected, accessible, enabled accounts and separates currencies", () => {
    const data = [account(1), account(2, "EUR", "20"), { ...account(3), enabled: false }, account(4)];
    const summary = menuBarSummary(data, ["1", "2", "3", "999"], "NOK");
    expect(summary.selected.map(({ id }) => id)).toEqual([1, 2]);
    expect(summary.totals).toHaveLength(2);
    expect(summary.displayed?.[1].amount.toString()).toBe("10.1");
    expect(menuBarSummary(data, [], "NOK").displayed).toBeUndefined();
    expect(menuBarSummary(data, ["2"], "NOK").displayed).toBeUndefined();
  });
  it("reports unavailable balances instead of treating them as zero", () => {
    const summary = menuBarSummary([{ ...account(1), balance: null }, account(2, "NOK", "0")], ["1", "2"], "NOK");
    expect(summary.unavailable).toBe(1);
    expect(summary.displayed?.[1].amount.toString()).toBe("0");
  });
});

describe("safe error diagnostics", () => {
  const runtime = { command: "search-transactions", raycast: "2.5.2", platform: "darwin" };
  it("copies status and context without arbitrary error messages, stacks, or properties", () => {
    const error = Object.assign(new SynciApiError("Bearer secret; IBAN DE000; balance 500", 403), {
      token: "secret",
      response: { account: "DE000" },
      stack: "/Users/Private/file",
    });
    const report = errorDiagnostics(error, runtime);
    expect(report).toContain("HTTP status: 403");
    expect(report).toContain("Command: search-transactions");
    expect(report).not.toMatch(/secret|DE000|500|Private/);
  });
  it("uses safe classifications for unknown and authentication errors", () => {
    expect(errorDiagnostics(new Error("secret"), runtime)).toContain("Failure: unexpected");
    expect(errorDiagnostics(new SignInRequiredError(), runtime)).toContain("Failure: sign-in-required");
    expect(errorDiagnostics(new SynciApiError("secret", 0, "network"), runtime)).toContain("Failure: network");
    const report = errorDiagnostics(new Error(), {
      command: "private-account",
      platform: "private-host",
      raycast: "secret-token",
    });
    expect(report).not.toMatch(/private-account|private-host|secret-token/);
  });
});
