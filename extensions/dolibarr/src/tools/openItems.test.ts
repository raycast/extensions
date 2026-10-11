import { describe, expect, it } from "vitest";
import { toInvoice, toOrder, toProposal, type Thirdparty } from "../api/types";
import { buildOpenItems } from "./openItems";

const web = "https://dolibarr.example.org";
const today = new Date("2026-08-08T12:00:00Z");
const seconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

const companies: Thirdparty[] = [
  { id: 7, name: "Kranich AG", nameAlias: null, email: null, phone: null, customerCode: null, relation: "customer" },
];

function invoice(ref: string, due: string, socid = 7) {
  return toInvoice(
    {
      id: "1",
      ref,
      socid: String(socid),
      status: 1,
      total_ht: "100",
      total_ttc: "119",
      date: seconds("2026-06-01T00:00:00Z"),
      date_lim_reglement: seconds(due),
      multicurrency_code: "EUR",
    },
    today,
  );
}

function proposal(ref: string, validUntil: string) {
  return toProposal(
    {
      id: "2",
      ref,
      socid: "7",
      status: 1,
      total_ht: "100",
      total_ttc: "238",
      date: seconds("2026-06-01T00:00:00Z"),
      fin_validite: seconds(validUntil),
      multicurrency_code: "EUR",
    },
    today,
  );
}

function order(ref: string, status: number, billed: string) {
  return toOrder({
    id: "3",
    ref,
    socid: "7",
    status,
    billed,
    total_ht: "100",
    total_ttc: "357",
    date: seconds("2026-05-01T00:00:00Z"),
    multicurrency_code: "EUR",
  });
}

const empty = { invoices: [], proposals: [], orders: [], companies, web, today };

describe("buildOpenItems", () => {
  it("keeps only what carries the matching flag", () => {
    const result = buildOpenItems({
      ...empty,
      invoices: [invoice("FA-late", "2026-08-01T00:00:00Z"), invoice("FA-future", "2026-09-01T00:00:00Z")],
      proposals: [proposal("A-old", "2026-07-01T00:00:00Z"), proposal("A-valid", "2026-09-01T00:00:00Z")],
      orders: [order("AB-tobill", 3, "0"), order("AB-billed", 3, "1"), order("AB-open", 1, "0")],
    });
    expect(result.overdueInvoices.map((i) => i.ref)).toEqual(["FA-late"]);
    expect(result.expiredProposals.map((p) => p.ref)).toEqual(["A-old"]);
    expect(result.unbilledOrders.map((o) => o.ref)).toEqual(["AB-tobill"]);
  });

  it("sorts overdue invoices by how long they are overdue", () => {
    const result = buildOpenItems({
      ...empty,
      invoices: [invoice("FA-recent", "2026-08-05T00:00:00Z"), invoice("FA-ancient", "2026-05-01T00:00:00Z")],
    });
    expect(result.overdueInvoices.map((i) => i.ref)).toEqual(["FA-ancient", "FA-recent"]);
    expect(result.overdueInvoices[0].daysOverdue).toBeGreaterThan(result.overdueInvoices[1].daysOverdue as number);
  });

  it("sorts expired proposals oldest first", () => {
    const result = buildOpenItems({
      ...empty,
      proposals: [proposal("A-recent", "2026-08-01T00:00:00Z"), proposal("A-ancient", "2026-05-01T00:00:00Z")],
    });
    expect(result.expiredProposals.map((p) => p.ref)).toEqual(["A-ancient", "A-recent"]);
  });

  it("counts and totals each category", () => {
    const result = buildOpenItems({
      ...empty,
      invoices: [invoice("FA-1", "2026-08-01T00:00:00Z")],
      proposals: [proposal("A-1", "2026-07-01T00:00:00Z")],
      orders: [order("AB-1", 3, "0")],
    });
    expect(result.summary.overdueInvoiceCount).toBe(1);
    expect(result.summary.overdueInvoiceTotal).toBe(119);
    expect(result.summary.expiredProposalTotal).toBe(238);
    expect(result.summary.unbilledOrderTotal).toBe(357);
    expect(result.summary.currency).toBe("EUR");
  });

  it("resolves company names and keeps unknown ones", () => {
    const result = buildOpenItems({
      ...empty,
      invoices: [invoice("FA-known", "2026-08-01T00:00:00Z", 7), invoice("FA-unknown", "2026-08-01T00:00:00Z", 999)],
    });
    const names = result.overdueInvoices.map((i) => i.companyName);
    expect(names).toContain("Kranich AG");
    expect(names).toContain(null);
  });

  it("reports null currency once more than one is involved", () => {
    const chf = toInvoice(
      {
        id: "9",
        ref: "FA-chf",
        socid: "7",
        status: 1,
        total_ht: "1",
        total_ttc: "1",
        date: seconds("2026-06-01T00:00:00Z"),
        date_lim_reglement: seconds("2026-08-01T00:00:00Z"),
        multicurrency_code: "CHF",
      },
      today,
    );
    const result = buildOpenItems({ ...empty, invoices: [invoice("FA-eur", "2026-08-01T00:00:00Z"), chf] });
    expect(result.summary.currency).toBeNull();
  });

  it("returns empty categories rather than failing when nothing is open", () => {
    const result = buildOpenItems(empty);
    expect(result.overdueInvoices).toEqual([]);
    expect(result.summary.overdueInvoiceCount).toBe(0);
    expect(result.summary.currency).toBeNull();
  });
});
