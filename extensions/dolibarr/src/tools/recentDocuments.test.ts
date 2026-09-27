import { describe, expect, it } from "vitest";
import { toInvoice, toOrder, toProposal, type Thirdparty } from "../api/types";
import { buildRecentDocuments } from "./recentDocuments";

const web = "https://dolibarr.example.org";
const seconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

const companies: Thirdparty[] = [
  { id: 7, name: "Kranich AG", nameAlias: null, email: null, phone: null, customerCode: null, relation: "customer" },
];

function order(ref: string, date: string, status = 1) {
  return toOrder({
    id: "1",
    ref,
    socid: "7",
    status,
    billed: "1",
    total_ht: "1",
    total_ttc: "119",
    date: seconds(date),
    multicurrency_code: "EUR",
  });
}

function invoiceOn(ref: string, date: string) {
  return toInvoice({
    id: "2",
    ref,
    socid: "7",
    status: 2,
    total_ht: "1",
    total_ttc: "238",
    date: seconds(date),
    multicurrency_code: "EUR",
  });
}

function proposalOn(ref: string, date: string) {
  return toProposal({
    id: "3",
    ref,
    socid: "7",
    status: 2,
    total_ht: "1",
    total_ttc: "357",
    date: seconds(date),
    multicurrency_code: "EUR",
  });
}

describe("buildRecentDocuments", () => {
  it("sorts across kinds by date, newest first", () => {
    const result = buildRecentDocuments(
      [
        order("AB-mid", "2026-07-01T00:00:00Z"),
        invoiceOn("FA-new", "2026-08-01T00:00:00Z"),
        proposalOn("A-old", "2026-06-01T00:00:00Z"),
      ],
      companies,
      web,
      10,
    );
    expect(result.documents.map((d) => d.ref)).toEqual(["FA-new", "AB-mid", "A-old"]);
  });

  it("applies the limit after merging, not per kind", () => {
    // Two invoices are newer than the only order; a per-kind limit of 2 would still show the order.
    const result = buildRecentDocuments(
      [
        order("AB-old", "2026-01-01T00:00:00Z"),
        invoiceOn("FA-1", "2026-08-01T00:00:00Z"),
        invoiceOn("FA-2", "2026-07-01T00:00:00Z"),
      ],
      companies,
      web,
      2,
    );
    expect(result.documents.map((d) => d.ref)).toEqual(["FA-1", "FA-2"]);
    expect(result.count).toBe(2);
  });

  it("marks drafts, so a provisional reference is not mistaken for an error", () => {
    const result = buildRecentDocuments([order("(PROV22)", "2026-08-01T00:00:00Z", 0)], companies, web, 10);
    expect(result.documents[0].isDraft).toBe(true);
    expect(result.documents[0].ref).toBe("(PROV22)");
  });

  it("does not mark a validated document as draft", () => {
    const result = buildRecentDocuments([order("AB-1", "2026-08-01T00:00:00Z", 1)], companies, web, 10);
    expect(result.documents[0].isDraft).toBe(false);
  });

  it("puts documents without a date at the end instead of breaking the order", () => {
    const undated = toOrder({
      id: "4",
      ref: "AB-undated",
      socid: "7",
      status: 1,
      billed: "1",
      total_ht: "1",
      total_ttc: "1",
      date: 0,
      multicurrency_code: "EUR",
    });
    const result = buildRecentDocuments([undated, order("AB-dated", "2026-08-01T00:00:00Z")], companies, web, 10);
    expect(result.documents.map((d) => d.ref)).toEqual(["AB-dated", "AB-undated"]);
  });

  it("resolves the company name and keeps unknown ones", () => {
    const foreign = toOrder({
      id: "5",
      ref: "AB-foreign",
      socid: "999",
      status: 1,
      billed: "1",
      total_ht: "1",
      total_ttc: "1",
      date: seconds("2026-08-01T00:00:00Z"),
      multicurrency_code: "EUR",
    });
    const result = buildRecentDocuments([order("AB-known", "2026-08-02T00:00:00Z"), foreign], companies, web, 10);
    expect(result.documents[0].companyName).toBe("Kranich AG");
    expect(result.documents[1].companyName).toBeNull();
  });

  it("carries kind, status and a deep link", () => {
    const result = buildRecentDocuments([order("AB-1", "2026-08-01T00:00:00Z")], companies, web, 10);
    expect(result.documents[0].kind).toBe("order");
    expect(result.documents[0].status).toBe("Open");
    expect(result.documents[0].url).toContain("/commande/card.php");
  });
});
