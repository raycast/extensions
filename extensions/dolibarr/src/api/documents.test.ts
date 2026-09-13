import { describe, expect, it, vi } from "vitest";
import type { Client } from "./client";
import {
  downloadDocumentPdf,
  fetchAllOrders,
  fetchAllProposals,
  fetchInvoices,
  fetchOrders,
  fetchProposals,
  fetchRecentDocuments,
  fetchUnpaidInvoices,
} from "./documents";

function clientReturning(rows: unknown[]) {
  const list = vi.fn(async () => rows);
  return { list, one: vi.fn(), all: vi.fn() } as unknown as Client & { list: ReturnType<typeof vi.fn> };
}

describe("fetchProposals", () => {
  it("filters via thirdparty_ids rather than sqlfilters", async () => {
    const client = clientReturning([]);
    await fetchProposals(client, 775);
    const params = client.list.mock.calls[0][1] as Record<string, unknown>;
    expect(params.thirdparty_ids).toBe(775);
    expect(JSON.stringify(params)).not.toContain("sqlfilters");
  });

  it("rejects a non-integer ID before any request is made", async () => {
    const client = clientReturning([]);
    await expect(fetchProposals(client, 1.5)).rejects.toThrow(/ID/);
    expect(client.list).not.toHaveBeenCalled();
  });

  it("sorts the newest documents first", async () => {
    const client = clientReturning([
      { id: "1", ref: "A-1", socid: "775", status: 1, date: 1000, total_ht: "1", total_ttc: "1" },
      { id: "2", ref: "A-2", socid: "775", status: 1, date: 2000, total_ht: "1", total_ttc: "1" },
    ]);
    const result = await fetchProposals(client, 775);
    expect(result.map((d) => d.ref)).toEqual(["A-2", "A-1"]);
  });
});

describe("downloadDocumentPdf", () => {
  function clientAnswering(body: unknown) {
    const one = vi.fn(async () => body);
    return { list: vi.fn(), one, all: vi.fn() } as unknown as Client & { one: ReturnType<typeof vi.fn> };
  }

  it("decodes the base64 content into raw bytes", async () => {
    const pdf = Buffer.from("%PDF-1.7 Testinhalt");
    const client = clientAnswering({ content: pdf.toString("base64"), encoding: "base64", filename: "A-1.pdf" });
    const result = await downloadDocumentPdf(client, "invoice", "A-1");
    expect(result.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result.equals(pdf)).toBe(true);
  });

  it("requests the correct module name and file path", async () => {
    const client = clientAnswering({ content: "AA==", encoding: "base64" });
    await downloadDocumentPdf(client, "invoice", "R202608-0179");
    expect(client.one.mock.calls[0][1]).toEqual({
      modulepart: "facture",
      original_file: "R202608-0179/R202608-0179.pdf",
    });
  });

  it("uses the propal module name for proposals", async () => {
    const client = clientAnswering({ content: "AA==", encoding: "base64" });
    await downloadDocumentPdf(client, "proposal", "A-1");
    expect((client.one.mock.calls[0][1] as { modulepart: string }).modulepart).toBe("propal");
  });

  it("reports missing content as an error", async () => {
    const client = clientAnswering({ encoding: "base64" });
    await expect(downloadDocumentPdf(client, "invoice", "A-1")).rejects.toThrow(/No PDF/);
  });

  it("rejects an unexpected encoding", async () => {
    const client = clientAnswering({ content: "abc", encoding: "hex" });
    await expect(downloadDocumentPdf(client, "invoice", "A-1")).rejects.toThrow(/encoding/);
  });
});

describe("fetchInvoices", () => {
  it("tags the document kind", async () => {
    const client = clientReturning([
      { id: "1", ref: "FA-1", socid: "775", status: 2, date: 1000, total_ht: "1", total_ttc: "1" },
    ]);
    const [invoice] = await fetchInvoices(client, 775);
    expect(invoice.kind).toBe("invoice");
  });
});

describe("fetchUnpaidInvoices", () => {
  it("filters server-side via status=unpaid rather than sqlfilters", async () => {
    const client = clientReturning([]);
    await fetchUnpaidInvoices(client);
    const [path, params] = client.list.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/invoices");
    expect(params.status).toBe("unpaid");
    expect(JSON.stringify(params)).not.toContain("sqlfilters");
  });

  it("requests the payment deadline as well", async () => {
    const client = clientReturning([]);
    await fetchUnpaidInvoices(client);
    const params = client.list.mock.calls[0][1] as Record<string, string>;
    expect(params.properties).toContain("date_lim_reglement");
  });

  it("flags overdue invoices", async () => {
    const past = Math.floor(new Date("2020-01-01").getTime() / 1000);
    const client = clientReturning([
      {
        id: "1",
        ref: "FA-1",
        socid: "7",
        status: 1,
        total_ht: "1",
        total_ttc: "1",
        date: past,
        date_lim_reglement: past,
      },
    ]);
    const [invoice] = await fetchUnpaidInvoices(client);
    expect(invoice.isOverdue).toBe(true);
    expect(invoice.kind).toBe("invoice");
  });
});

describe("fetchOrders", () => {
  it("filters via thirdparty_ids rather than sqlfilters", async () => {
    const client = clientReturning([]);
    await fetchOrders(client, 774);
    const [path, params] = client.list.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/orders");
    expect(params.thirdparty_ids).toBe(774);
    expect(JSON.stringify(params)).not.toContain("sqlfilters");
  });

  it("requests the billed flag, without which to-bill cannot be derived", async () => {
    const client = clientReturning([]);
    await fetchOrders(client, 774);
    const params = client.list.mock.calls[0][1] as Record<string, string>;
    expect(params.properties).toContain("billed");
  });

  it("marks a delivered and uninvoiced order", async () => {
    const client = clientReturning([
      { id: "1", ref: "AB-1", socid: "774", status: 3, billed: "0", total_ht: "1", total_ttc: "1", date: 1000 },
    ]);
    const [order] = await fetchOrders(client, 774);
    expect(order.kind).toBe("order");
    expect(order.isUnbilled).toBe(true);
  });

  it("sorts the newest orders first", async () => {
    const client = clientReturning([
      { id: "1", ref: "AB-old", socid: "774", status: 1, billed: "0", total_ht: "1", total_ttc: "1", date: 1000 },
      { id: "2", ref: "AB-new", socid: "774", status: 1, billed: "0", total_ht: "1", total_ttc: "1", date: 2000 },
    ]);
    const orders = await fetchOrders(client, 774);
    expect(orders.map((o) => o.ref)).toEqual(["AB-new", "AB-old"]);
  });
});

describe("fetchRecentDocuments", () => {
  it("sorts newest first using the field that belongs to the kind", async () => {
    const client = clientReturning([]);
    await fetchRecentDocuments(client, "proposal", 5);
    const params = client.list.mock.calls[0][1] as Record<string, unknown>;
    expect(params.sortfield).toBe("t.datep");
    expect(params.sortorder).toBe("DESC");
    expect(params.limit).toBe(5);
  });

  it("uses the order date for orders and the invoice date for invoices", async () => {
    const orderClient = clientReturning([]);
    await fetchRecentDocuments(orderClient, "order", 5);
    expect((orderClient.list.mock.calls[0][1] as Record<string, unknown>).sortfield).toBe("t.date_commande");

    const invoiceClient = clientReturning([]);
    await fetchRecentDocuments(invoiceClient, "invoice", 5);
    expect((invoiceClient.list.mock.calls[0][1] as Record<string, unknown>).sortfield).toBe("t.datef");
  });

  it("never uses sqlfilters", async () => {
    const client = clientReturning([]);
    await fetchRecentDocuments(client, "invoice", 5);
    expect(JSON.stringify(client.list.mock.calls[0][1])).not.toContain("sqlfilters");
  });

  it("converts with the converter belonging to the kind", async () => {
    const client = clientReturning([
      { id: "1", ref: "AB-1", socid: "7", status: 3, billed: "0", total_ht: "1", total_ttc: "1", date: 1000 },
    ]);
    const [order] = await fetchRecentDocuments(client, "order", 5);
    expect(order.kind).toBe("order");
    // Only toOrder derives this; a wrong converter would leave it false.
    expect(order.isUnbilled).toBe(true);
  });
});

describe("fetchAllProposals and fetchAllOrders", () => {
  it("loads proposals without a company filter", async () => {
    const client = clientReturning([]);
    await fetchAllProposals(client);
    const [path, params] = client.list.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe("/proposals");
    expect(params.thirdparty_ids).toBeUndefined();
  });

  it("loads orders without a company filter", async () => {
    const client = clientReturning([]);
    await fetchAllOrders(client);
    expect(client.list.mock.calls[0][0]).toBe("/orders");
  });
});
