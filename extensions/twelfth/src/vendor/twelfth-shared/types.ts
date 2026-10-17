// Typed wrappers over the Twelfth MCP tools the extensions read. Shapes mirror
// app/core/src/mcp-output-schemas.ts; every field the server may leave out is
// optional here.

export type CallOptions = {
  interactive?: boolean;
  /**
   * Retry once after a timeout or gateway error. True by default because
   * reads are safe to repeat; a call that changes something and isn't
   * idempotent (twelfth_create_action) passes false, so a slow answer can't
   * become two tasks.
   */
  retry?: boolean;
};

/** One MCP `tools/call`, already authenticated: see mcp.ts. */
export type CallTool = <T>(name: string, args?: Record<string, unknown>, options?: CallOptions) => Promise<T>;

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

/** Every order twelfth_list_products accepts (PRODUCT_SORTS is the shorter list Raycast offers). */
export type ProductOrder =
  | "name"
  | "sku"
  | "category"
  | "supplier"
  | "remit"
  | "findings"
  | "stock"
  | "velocity"
  | "cover"
  | "units_l4w"
  | "units_l1y"
  | "gp_pct"
  | "price"
  | "on_order"
  | "days_since_sold";

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

export type TrackedSetSummary = { id: string; name: string; scopedOut: boolean; url?: string };

export type TrackedSetComparison = {
  retailer: string;
  latestPrice: Figure;
  averagePrice: Figure;
  /** Price index against ours; 100 is parity. */
  index: Figure;
  stock: string;
};

export type TrackedSetPage = {
  id: string;
  name: string;
  scopedOut: boolean;
  asOf?: string;
  total: number;
  hasMore: boolean;
  competitors?: Array<{ key: string; label?: string }>;
  rows: Array<{
    sku: string;
    title: string;
    ownObservedPrice: Figure;
    ownAveragePrice: Figure;
    comparisons: TrackedSetComparison[];
  }>;
  url?: string;
};

/** Price basis for a tracked set: the last observed price, or an average over 4, 8 or 12 weeks. */
export type PricingWindow = "live" | 4 | 8 | 12;

export type ActionChange = {
  action: { id: string; title: string; status: string; dueAt: string | null; snoozedUntil: string | null; url: string };
};

/** The write tools' names: present in `tools/list` only when the person allowed changes. */
export const WRITE_TOOLS = ["twelfth_complete_action", "twelfth_snooze_action", "twelfth_create_action"] as const;

/** The read tools, bound to one client's authenticated `callTool`. */
export function twelfthTools(callTool: CallTool) {
  return {
    getWorkspace(options?: CallOptions) {
      return callTool<Workspace | null>("twelfth_get_workspace", {}, options);
    },

    async listOpenActions(options?: CallOptions) {
      return (await callTool<{ actions: Action[] }>("twelfth_list_open_actions", {}, options)).actions;
    },

    listProducts(
      input: {
        query?: string;
        sort?: ProductSort | ProductOrder;
        dir?: "asc" | "desc";
        limit?: number;
        offset?: number;
        categoryIds?: string[];
        remitKeys?: string[];
        suppliers?: string[];
      },
      options?: CallOptions,
    ) {
      const sort = input.sort ?? "name";
      const dir = input.dir ?? (sort in PRODUCT_SORTS ? PRODUCT_SORTS[sort as ProductSort].dir : "asc");
      return callTool<ProductPage>(
        "twelfth_list_products",
        {
          ...(input.query?.trim() ? { query: input.query.trim().slice(0, 200) } : {}),
          sort,
          dir,
          limit: input.limit ?? 50,
          offset: input.offset ?? 0,
          ...(input.categoryIds?.length ? { categoryIds: input.categoryIds.slice(0, 20) } : {}),
          ...(input.remitKeys?.length ? { remitKeys: input.remitKeys.slice(0, 20) } : {}),
          ...(input.suppliers?.length ? { suppliers: input.suppliers.slice(0, 20) } : {}),
        },
        options,
      );
    },

    /** Managed categories with the remits that own them, for product filters. */
    listCategories(options?: CallOptions) {
      return callTool<{
        categories: Array<{
          id: string;
          label: string;
          productCount?: number;
          remits?: Array<{ bookKey: string; label: string }>;
        }>;
      }>("twelfth_list_category_settings", {}, options);
    },

    /** Up to 100 SKUs in one call; unknown or unreadable ones come back in `notFound`. */
    getProducts(skus: string[], options?: CallOptions) {
      return callTool<{ products: Product[]; notFound: string[] }>("twelfth_get_products", { skus }, options);
    },

    async listTrackedSets(options?: CallOptions) {
      return (await callTool<{ sets: TrackedSetSummary[] }>("twelfth_list_tracked_sets", {}, options)).sets;
    },

    getTrackedSet(
      input: { setId: string; window?: PricingWindow; limit?: number; offset?: number },
      options?: CallOptions,
    ) {
      return callTool<TrackedSetPage>(
        "twelfth_get_tracked_set",
        {
          setId: input.setId,
          window: input.window ?? 4,
          limit: input.limit ?? 50,
          offset: input.offset ?? 0,
        },
        options,
      );
    },

    // Changes, offered only to a connection whose person allowed them
    // (twelfth_* write tools in Core's mcp-write-tools.ts).
    completeAction(actionId: string, options?: CallOptions) {
      return callTool<ActionChange>("twelfth_complete_action", { actionId }, options);
    },

    snoozeAction(actionId: string, until: "tomorrow" | "next_week", options?: CallOptions) {
      return callTool<ActionChange>("twelfth_snooze_action", { actionId, until }, options);
    },

    /** Never retried: a second attempt after a slow answer would be a second task. */
    createAction(input: { title: string; details?: string }, options?: CallOptions) {
      return callTool<ActionChange>("twelfth_create_action", input, { ...options, retry: false });
    },

    async listProjects(state: ProjectState = "live", options?: CallOptions) {
      return (await callTool<{ projects: Project[] }>("twelfth_list_projects", { state }, options)).projects;
    },
  };
}
