import { afterEach, describe, expect, it } from "vitest";
import { documentStatusKey, documentStatusTone, formatMoney } from "../src/lib/format";
import { filterProjects, isEmpty, recordLink, runSearch, splitDocuments } from "../src/lib/search";
import { byId } from "../src/lib/timer";
import type { FolnaroApi } from "../src/lib/folnaro";
import type { DocumentSummary } from "../src/lib/types";
import { harness, toolCalls, type Harness } from "./helpers";

let current: Harness | undefined;
afterEach(() => current?.client.close());

describe("Search Folnaro", () => {
  it("fills every section with one helper process", async () => {
    const h = (current = harness("demo.json"));
    const results = await runSearch(h.api, "", "all");
    expect(results.invoices.map((document) => document.number)).toEqual([
      "RE-2026-0142",
      "RE-2026-0139",
      "RE-2026-0141",
      "RE-2026-0137",
      null,
    ]);
    expect(results.quotes.map((document) => document.number)).toEqual(["AN-2026-031", "AN-2026-029"]);
    expect(results.customers).toHaveLength(5);
    expect(results.expenses[0].vendor).toBe("Wolkenhost GmbH");
    expect(results.projects.map((project) => project.name)).toContain("Website-Relaunch");
    expect(results.projectCustomers.get("C-NORD")?.display_name).toBe("Nordlicht Medien GmbH");
    expect(h.sent().filter((message) => message.method === "initialize")).toHaveLength(1);
  });

  it("gives invoices and quotes their own limit in the Everything scope", async () => {
    const document = (id: string, kind: DocumentSummary["kind"]) => ({ id, kind, number: id }) as DocumentSummary;
    const all = [
      ...Array.from({ length: 20 }, (_, index) => document(`RE-${index}`, "invoice")),
      ...Array.from({ length: 3 }, (_, index) => document(`AN-${index}`, "quote")),
    ];
    const api = {
      // Like documents_list: filter by kind, then cut at the limit.
      documents: async (options: { kinds?: string[]; limit?: number }) =>
        all.filter((item) => options.kinds?.includes(item.kind)).slice(0, options.limit),
      customers: async () => [],
      expenses: async () => [],
      projects: async () => [],
    } as unknown as FolnaroApi;
    const results = await runSearch(api, "", "all");
    expect(results.invoices).toHaveLength(8);
    expect(results.quotes.map((item) => item.id)).toEqual(["AN-0", "AN-1", "AN-2"]);
  });

  it("passes the query and the kinds of the chosen scope to documents_list", async () => {
    const h = (current = harness("demo.json"));
    await runSearch(h.api, "Nordlicht", "invoices");
    const [call] = toolCalls(h, "documents_list");
    expect(call.params?.arguments).toEqual({
      query: "Nordlicht",
      kind: ["invoice", "partialInvoice", "finalInvoice", "creditNote", "cancellation"],
      limit: 50,
    });
    expect(toolCalls(h, "customers_search")).toHaveLength(0);
    expect(toolCalls(h, "expenses_list")).toHaveLength(0);
  });

  it("searches customers by text and loads all of them only to name projects", async () => {
    const h = (current = harness("demo.json"));
    await runSearch(h.api, "Hafen", "customers");
    expect(toolCalls(h, "customers_search").map((call) => call.params?.arguments)).toEqual(
      expect.arrayContaining([{ query: "Hafen", limit: 50 }, { limit: 500 }]),
    );
  });

  it("filters projects by name, number and customer, accent insensitive", async () => {
    const h = (current = harness("demo.json"));
    const [projects, customers] = await Promise.all([h.api.projects(), h.api.customers({ limit: 500 })]);
    const map = byId(customers);
    expect(filterProjects(projects, "gruenwerk", map).map((project) => project.name)).toEqual([]);
    expect(filterProjects(projects, "grunwerk", map).map((project) => project.name)).toEqual(["Newsletter-Vorlagen"]);
    expect(filterProjects(projects, "p-2026-09", map).map((project) => project.name)).toEqual(["App-Prototyp"]);
  });

  it("shows overdue before the stored status and formats money in the given locale", async () => {
    const h = (current = harness("demo.json"));
    const documents = await h.api.documents();
    const overdue = documents.find((document) => document.number === "RE-2026-0139")!;
    expect(documentStatusKey(overdue)).toBe("status.overdue");
    expect(documentStatusTone(overdue)).toBe("overdue");
    expect(formatMoney(overdue.gross_total_cents, "de-DE")).toBe("2.142,00\u00a0€");
    expect(formatMoney(overdue.gross_total_cents, "en-US")).toBe("€2,142.00");
    const { invoices, quotes } = splitDocuments(documents);
    expect(invoices.length + quotes.length).toBe(documents.length);
  });

  it("builds folnaro:// record links the app opens", () => {
    expect(recordLink("document", "D-142")).toBe("folnaro://document/D-142");
    expect(recordLink("customer", "a b")).toBe("folnaro://customer/a%20b");
  });

  it("knows an empty result", () => {
    expect(
      isEmpty({ invoices: [], quotes: [], customers: [], expenses: [], projects: [], projectCustomers: new Map() }),
    ).toBe(true);
  });
});
