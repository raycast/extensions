import { describe, expect, it } from "vitest";
import { merchantLogo } from "../src/lib/merchant";
import type { Transaction } from "../src/lib/types";

const transaction = (fields: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  financial_account_id: 1,
  amount: "-5",
  currency: "EUR",
  booked: true,
  ...fields,
});

describe("merchant logos", () => {
  it("keeps a neutral icon when a generic bank payee groups different enriched merchants", () => {
    expect(
      merchantLogo([
        transaction({ enriched: { counterparty: { name: "Merchant A", logo_url: "https://example.com/a.png" } } }),
        transaction({
          id: 2,
          enriched: { counterparty: { name: "Merchant B", logo_url: "https://example.com/b.png" } },
        }),
      ]),
    ).toBeUndefined();
  });
  it("uses the newest available counterparty logo even when other records lack enrichment", () => {
    const records = [
      transaction({ id: 2, enriched: { counterparty: { logo_url: "https://example.com/old.png" } } }),
      transaction({ id: 4, enriched: null }),
      transaction({ id: 3, enriched: { counterparty: { logo_url: "https://example.com/new.png" } } }),
    ];
    expect(merchantLogo(records)).toBe("https://example.com/new.png");
    expect(records[0].id).toBe(2);
  });
  it("does not substitute a payment intermediary for the merchant", () => {
    expect(
      merchantLogo([transaction({ enriched: { intermediary: { logo_url: "https://example.com/processor.png" } } })]),
    ).toBeUndefined();
  });
  it.each([
    "/etc/passwd",
    "file:///tmp/logo.png",
    "data:image/svg+xml,logo",
    "http://example.com/logo.png",
    "https://user:secret@example.com/logo.png",
    "not a URL",
    "",
  ])("rejects an unsafe or malformed image source: %s", (logo_url) => {
    expect(merchantLogo([transaction({ enriched: { counterparty: { logo_url } } })])).toBeUndefined();
  });
});
