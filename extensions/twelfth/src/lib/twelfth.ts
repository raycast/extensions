// Typed wrappers over the Twelfth MCP tools this extension reads. Shapes
// mirror app/core/src/mcp-output-schemas.ts; every field the server may leave
// out is optional here.
import { callTool } from "./mcp";

type CallOptions = { interactive?: boolean };

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  timezone: string | null;
  currencyCode: string | null;
  countryCode: string | null;
};

export type Action = {
  id: string;
  title: string;
  details: string | null;
  dueAt: string | null;
  bookKey: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  sourceSessionId: string | null;
  sourceTitle: string | null;
  sourceSummary: string | null;
  sourceKind: string | null;
};

export type Figure = number | null;

export type Product = {
  sku: string;
  name: string;
  category: { id: string | null; label: string };
  remit: { key: string; label: string };
  supplier: string | null;
  labels: string[];
  position: {
    stockOnHand: Figure;
    velocityPerDay: Figure;
    daysCover: Figure;
    unitsL4w: Figure;
    unitsL1y: Figure;
    gpPct: Figure;
    price: Figure;
    onOrder: Figure;
    daysSinceSold: Figure;
    asOf: string | null;
  };
  openFindings: number;
  url?: string;
  path: string;
};

export type ProductPage = { products: Product[]; totalMatching: number; hasMore: boolean };

export const PRODUCT_SORTS = {
  findings: { label: "Most Open Findings", dir: "desc" },
  cover: { label: "Lowest Cover", dir: "asc" },
  velocity: { label: "Fastest Selling", dir: "desc" },
  days_since_sold: { label: "Longest Since Sold", dir: "desc" },
  gp_pct: { label: "Lowest GP%", dir: "asc" },
  name: { label: "Name", dir: "asc" },
} as const;
export type ProductSort = keyof typeof PRODUCT_SORTS;

export type Project = {
  id: string;
  workflowLabel: string;
  name: string;
  status: string;
  stage: { key: string; label: string; index: number; total: number } | null;
  owner: { name?: string; email?: string } | null;
  openTaskCount: number;
  overdueTaskCount: number;
  headline?: string | null;
  goLiveAt?: string | null;
  startedAt: string;
  updatedAt: string;
};
export type ProjectState = "live" | "closed" | "archived" | "all";

export function getWorkspace(options?: CallOptions) {
  return callTool<Workspace | null>("twelfth_get_workspace", {}, options);
}

export async function listOpenActions(options?: CallOptions) {
  return (await callTool<{ actions: Action[] }>("twelfth_list_open_actions", {}, options)).actions;
}

export function listProducts(
  input: { query?: string; sort?: ProductSort; limit?: number; offset?: number },
  options?: CallOptions,
) {
  const sort = input.sort ?? "name";
  return callTool<ProductPage>(
    "twelfth_list_products",
    {
      ...(input.query?.trim() ? { query: input.query.trim().slice(0, 200) } : {}),
      sort,
      dir: PRODUCT_SORTS[sort].dir,
      limit: input.limit ?? 50,
      offset: input.offset ?? 0,
    },
    options,
  );
}

export async function listProjects(state: ProjectState = "live", options?: CallOptions) {
  return (await callTool<{ projects: Project[] }>("twelfth_list_projects", { state }, options)).projects;
}
