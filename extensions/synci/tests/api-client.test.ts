import { describe, expect, it, vi } from "vitest";
import { SynciClient, transactionParams } from "../src/lib/api-client";
import { SignInRequiredError } from "../src/lib/oauth-session";

const page = (data: unknown[], current = 1, last = 1) =>
  Response.json({
    data,
    meta: { current_page: current, last_page: last, total: 200 },
    links: { next: current < last ? "https://untrusted.example/page" : null },
  });

describe("Synci API", () => {
  it("encodes queries and includes safe read-only parameters", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(page([]));
    const client = new SynciClient(async () => "token", transport);
    await client.transactions({ search: "coffee & tea", accountId: "42", booked: false }, 1);
    const [input, init] = transport.mock.calls[0];
    const url = new URL(String(input));
    expect(url.searchParams.get("filter[search]")).toBe("coffee & tea");
    expect(url.searchParams.get("filter[booked]")).toBe("0");
    expect(url.searchParams.get("filter[financial_account_id]")).toBe("42");
    expect(url.searchParams.get("omit_sensitive_identifiers")).toBe("1");
    expect(url.searchParams.get("include")?.split(",")).toContain("enriched");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer token", Accept: "application/json" });
    expect(init?.redirect).toBe("error");
  });
  it("uses metadata across empty pages and never forwards bearer tokens to links.next", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page([], 1, 2))
      .mockResolvedValueOnce(page([{ id: 2 }], 2, 2));
    const client = new SynciClient(async () => "token", transport);
    expect(await client.accounts()).toEqual([{ id: 2 }]);
    expect(String(transport.mock.calls[1][0])).toContain("https://api.synci.io/api/v1/finance/accounts?");
    expect(new URL(String(transport.mock.calls[1][0])).searchParams.get("page[number]")).toBe("2");
  });
  it("skips rule-filtered empty pages when loading a transaction batch", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page([], 1, 3))
      .mockResolvedValueOnce(page([{ id: 2 }], 2, 3));
    const result = await new SynciClient(async () => "token", transport).transactionBatch({}, 1);
    expect(result).toEqual({ data: [{ id: 2 }], hasMore: true, cursor: 3 });
  });
  it("finds amounts beyond the first page while retaining the account, date, and status filters", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page([{ id: 1, amount: "-10" }], 1, 3))
      .mockResolvedValueOnce(page([{ id: 2, amount: "-50.25" }], 2, 3))
      .mockResolvedValueOnce(page([{ id: 3, amount: "50.25" }], 3, 3));
    const result = await new SynciClient(async () => "token", transport).transactionBatch(
      { search: "50,25", accountId: "42", booked: true, period: "month" },
      1,
    );
    expect(result).toEqual({
      data: [{ id: 2, amount: "-50.25" }],
      hasMore: true,
      cursor: 3,
    });
    const params = new URL(String(transport.mock.calls[0][0])).searchParams;
    expect(params.has("filter[search]")).toBe(false);
    expect(params.get("filter[financial_account_id]")).toBe("42");
    expect(params.get("filter[booked]")).toBe("1");
    expect(params.has("filter[booking_date_after]")).toBe(true);
  });
  it("returns a matching page promptly and resumes at the next unconsumed page", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValueOnce(
      page(
        Array.from({ length: 20 }, (_, id) => ({ id, amount: "-50" })),
        4,
        8,
      ),
    );
    const result = await new SynciClient(async () => "token", transport).transactionBatch({ search: "-50" }, 4);
    expect(result.data).toHaveLength(20);
    expect(result).toMatchObject({ hasMore: true, cursor: 5 });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("reports a capped amount scan instead of claiming no matches", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        page([], Number(new URL(String(input)).searchParams.get("page[number]")), 101),
      );
    await expect(new SynciClient(async () => "token", transport).transactionBatch({ search: "50" }, 1)).rejects.toThrow(
      "Amount search scanned 10,000 records",
    );
  });
  it("resolves missing account summaries from complete balance history", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page([{ id: 1, currency: "NOK", balance: {}, enabled: true }]))
      .mockResolvedValueOnce(page([{ id: 1, amount: "0", currency: "NOK", type: "CLOSING_BOOKED" }]));
    const [account] = await new SynciClient(async () => "token", transport).accountsWithBalances();
    expect(account.balance).toEqual({ cleared: "0", available: "0" });
    expect(String(transport.mock.calls[1][0])).toContain("/finance/accounts/1/balances");
  });
  it("fails the whole aggregate when a later page fails", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page([{ id: 1 }], 1, 2))
      .mockResolvedValueOnce(new Response("upstream details", { status: 500 }));
    await expect(new SynciClient(async () => "token", transport).spending({ period: "7" })).rejects.toThrow("HTTP 500");
  });
  it("does not label a capped result as a complete total", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(page([], 1, 10));
    await expect(
      new SynciClient(async () => "token", transport).all("/finance/transactions", {}, undefined, 1),
    ).rejects.toThrow("shorter period");
  });
  it("returns a reauthentication error without exposing response bodies", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response("private data", { status: 401 }));
    await expect(new SynciClient(async () => "token", transport).accounts()).rejects.toBeInstanceOf(
      SignInRequiredError,
    );
  });
  it("surfaces rate limits without making a retry storm", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 429, headers: { "retry-after": "60" } }));
    await expect(new SynciClient(async () => "token", transport).accounts()).rejects.toThrow("60 seconds");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed pagination and HTML responses", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html>Log in</html>"));
    await expect(new SynciClient(async () => "token", transport).accounts()).rejects.toThrow("unexpected response");
  });
  it("cancels work before issuing the next request", async () => {
    const transport = vi.fn<typeof fetch>();
    const signal = AbortSignal.abort();
    await expect(new SynciClient(async () => "token", transport).accounts(signal)).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
  it("builds inclusive booking-date windows and omits empty filters", () => {
    expect(transactionParams({ period: "month", accountId: "all", search: "  " }, new Date(2026, 8, 25))).toMatchObject(
      { "filter[booking_date_after]": "2026-09-01", "filter[booking_date_before]": "2026-09-25" },
    );
    expect(transactionParams({})).not.toHaveProperty("filter[search]");
    expect(transactionParams({})).not.toHaveProperty("filter[financial_account_id]");
  });
  it("fetches every holdings page under the selected account with a stable sort", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page([{ id: 1 }], 1, 2))
      .mockResolvedValueOnce(page([{ id: 2 }], 2, 2));
    expect(await new SynciClient(async () => "token", transport).accountHoldings(42)).toEqual([{ id: 1 }, { id: 2 }]);
    for (const [input] of transport.mock.calls) {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/api/v1/finance/accounts/42/holdings");
      expect(url.origin).toBe("https://api.synci.io");
      expect(url.searchParams.get("sort")).toBe("-market_value,-id");
    }
  });
  it("bounds holdings requests to three accounts at a time and preserves account associations", async () => {
    let active = 0;
    let peak = 0;
    const transport = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      const id = Number(new URL(String(input)).pathname.split("/").at(-2));
      return page([{ id, financial_account_id: id }]);
    });
    const accounts = Array.from({ length: 7 }, (_, index) => ({ id: index + 1, enabled: true }));
    const result = await new SynciClient(async () => "token", transport).holdingsForAccounts(accounts);
    expect(peak).toBe(3);
    expect(result.map(({ account, holdings }) => [account.id, holdings[0].financial_account_id])).toEqual(
      accounts.map(({ id }) => [id, id]),
    );
  });
  it("does not return partial holdings if one account fails", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        String(input).includes("/accounts/2/") ? new Response("", { status: 500 }) : page([{ id: 1 }]),
      );
    await expect(
      new SynciClient(async () => "token", transport).holdingsForAccounts([
        { id: 1, enabled: true },
        { id: 2, enabled: true },
      ]),
    ).rejects.toThrow("HTTP 500");
  });
  it("stops scheduling holdings requests on a rate limit or cancellation", async () => {
    const accounts = Array.from({ length: 8 }, (_, id) => ({ id, enabled: true }));
    const transport = vi.fn<typeof fetch>().mockImplementation(async () => new Response("", { status: 429 }));
    const client = new SynciClient(async () => "token", transport);
    await expect(client.holdingsForAccounts(accounts)).rejects.toThrow("request limit");
    expect(transport).toHaveBeenCalledTimes(3);
    transport.mockClear();
    await expect(client.holdingsForAccounts(accounts, AbortSignal.abort())).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
  it("handles an account with no positions and an empty account selection", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(page([]));
    const client = new SynciClient(async () => "token", transport);
    const account = { id: 42, enabled: true };
    expect(await client.holdingsForAccounts([account])).toEqual([{ account, holdings: [] }]);
    expect(await client.holdingsForAccounts([])).toEqual([]);
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
