import { INVOICE_KINDS, QUOTE_KINDS, type FolnaroApi } from "./folnaro";
import { byId } from "./timer";
import type { Customer, DocumentKind, DocumentSummary, Expense, Project } from "./types";

export type SearchScope = "all" | "invoices" | "quotes" | "customers" | "expenses" | "projects";

export const SEARCH_SCOPES: SearchScope[] = ["all", "invoices", "quotes", "customers", "expenses", "projects"];

export interface SearchResults {
  invoices: DocumentSummary[];
  quotes: DocumentSummary[];
  customers: Customer[];
  expenses: Expense[];
  projects: Project[];
  /** Customers of the listed projects, to name them; not a section of its own. */
  projectCustomers: Map<string, Customer>;
}

export const EMPTY_RESULTS: SearchResults = {
  invoices: [],
  quotes: [],
  customers: [],
  expenses: [],
  projects: [],
  projectCustomers: new Map(),
};

/** Case and accent insensitive, like customers_search in Folnaro. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Projects have no search tool; filter the list by name, number and customer name. */
export function filterProjects(projects: Project[], query: string, customers: Map<string, Customer>): Project[] {
  const needle = normalize(query.trim());
  const visible = projects.filter((project) => !project.is_archived);
  if (!needle) return visible;
  return visible.filter((project) => {
    const customer = project.customer_id ? customers.get(project.customer_id) : undefined;
    return [project.name, project.number ?? "", customer?.display_name ?? ""].some((value) =>
      normalize(value).includes(needle),
    );
  });
}

/** Splits documents_list results into the Invoices and Quotes sections. Other kinds are left out. */
export function splitDocuments(documents: DocumentSummary[]): Pick<SearchResults, "invoices" | "quotes"> {
  return {
    invoices: documents.filter((document) => INVOICE_KINDS.includes(document.kind)),
    quotes: documents.filter((document) => QUOTE_KINDS.includes(document.kind)),
  };
}

/** How many rows each section shows: everything for a single scope, a short list for "all". */
export function sectionLimit(scope: SearchScope): number {
  return scope === "all" ? 8 : 50;
}

export function includes(scope: SearchScope, section: Exclude<SearchScope, "all">): boolean {
  return scope === "all" || scope === section;
}

export function isEmpty(results: SearchResults): boolean {
  const { invoices, quotes, customers, expenses, projects } = results;
  return [invoices, quotes, customers, expenses, projects].every((items) => items.length === 0);
}

/** `folnaro://<host>/<id>`, the record links Folnaro opens (mac/Folnaro/App/AppModel+Routing.swift). */
export function recordLink(kind: "document" | "customer" | "project" | "expense" | "time", id: string): string {
  return `folnaro://${kind}/${encodeURIComponent(id)}`;
}

/**
 * One search across the sections. Documents come from documents_list (number, title, customer),
 * customers from customers_search, expenses from expenses_list; projects have no search tool and
 * are filtered here. An empty query lists the newest documents and expenses and every customer.
 */
export async function runSearch(api: FolnaroApi, query: string, scope: SearchScope): Promise<SearchResults> {
  const limit = sectionLimit(scope);
  // Invoices and quotes are fetched separately so that many invoices never crowd out the quotes.
  const documentsOf = (kinds: DocumentKind[]) => api.documents({ query, kinds, limit });
  const wantsProjects = includes(scope, "projects");
  // Customers are also needed to name the customer of each project.
  const wantsCustomers = includes(scope, "customers") || wantsProjects;
  const [invoices, quotes, customers, expenses, allCustomers, projects] = await Promise.all([
    includes(scope, "invoices") ? documentsOf(INVOICE_KINDS) : Promise.resolve([]),
    includes(scope, "quotes") ? documentsOf(QUOTE_KINDS) : Promise.resolve([]),
    wantsCustomers && query ? api.customers({ query, limit }) : Promise.resolve(undefined),
    includes(scope, "expenses") ? api.expenses({ query, limit }) : Promise.resolve([]),
    wantsCustomers ? api.customers({ limit: 500 }) : Promise.resolve([]),
    wantsProjects ? api.projects() : Promise.resolve([]),
  ]);
  const customerMap = byId(allCustomers);
  return {
    invoices: splitDocuments(invoices).invoices.slice(0, limit),
    quotes: splitDocuments(quotes).quotes.slice(0, limit),
    customers: includes(scope, "customers") ? (customers ?? allCustomers).slice(0, limit) : [],
    expenses: expenses.slice(0, limit),
    projects: filterProjects(projects, query, customerMap).slice(0, limit),
    projectCustomers: customerMap,
  };
}
