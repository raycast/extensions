import { getPreferenceValues } from "@raycast/api";

import {
  Preferences,
  SalesDashboardData,
  SalesReportPeriod,
  WooCommerceOrder,
  WooCommerceSalesReport,
} from "./types";

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function normalizeStoreUrl(storeUrl: string): string {
  return storeUrl.trim().replace(/\/+$/, "");
}

export function normalizeWordPressUrl(wordpressUrl: string): string {
  return normalizeStoreUrl(wordpressUrl).replace(/\/wp-admin$/, "");
}

type OrderSearchOptions = {
  after?: string;
  before?: string;
  page?: number;
  perPage?: number;
  searchText?: string;
  status?: string;
};

export function getOrdersUrl(options: OrderSearchOptions = {}): string {
  const url = getWooCommerceApiUrl("/orders");

  url.searchParams.set(
    "per_page",
    String(options.perPage ?? getPreferences().ordersPerPage ?? "20"),
  );
  url.searchParams.set("orderby", "date");
  url.searchParams.set("order", "desc");

  if (options.page) {
    url.searchParams.set("page", String(options.page));
  }

  if (options.after) {
    url.searchParams.set("after", options.after);
  }

  if (options.before) {
    url.searchParams.set("before", options.before);
  }

  if (options.searchText?.trim()) {
    url.searchParams.set("search", options.searchText.trim());
  }

  if (options.status) {
    url.searchParams.set("status", options.status);
  }

  return url.toString();
}

export function getSalesReportUrl(period: SalesReportPeriod): string {
  const url = getWooCommerceApiUrl("/reports/sales");
  const dateRange = getSalesReportDateRange(period);

  url.searchParams.set("date_min", dateRange.start);
  url.searchParams.set("date_max", dateRange.end);

  return url.toString();
}

export function getCurrencySettingUrl(): string {
  return getWooCommerceApiUrl(
    "/settings/general/woocommerce_currency",
  ).toString();
}

export function getOrderAdminUrl(order: WooCommerceOrder): string {
  const preferences = getPreferences();
  const wordpressUrl = getSafeBaseUrl(
    preferences.wordpressUrl
      ? normalizeWordPressUrl(preferences.wordpressUrl)
      : preferences.storeUrl,
  );

  const url = new URL("/wp-admin/post.php", wordpressUrl);

  url.searchParams.set("post", String(order.id));
  url.searchParams.set("action", "edit");

  return url.toString();
}

export function getAuthorizationHeader(): string {
  const preferences = getPreferences();
  const credentials = Buffer.from(
    `${preferences.consumerKey}:${preferences.consumerSecret}`,
  ).toString("base64");

  return `Basic ${credentials}`;
}

export async function fetchOrders(
  options: OrderSearchOptions = {},
): Promise<WooCommerceOrder[]> {
  const response = await fetch(getOrdersUrl(options), {
    headers: {
      Authorization: getAuthorizationHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(
      `WooCommerce returned ${response.status}: ${response.statusText}`,
    );
  }

  return (await response.json()) as WooCommerceOrder[];
}

export async function fetchDashboardData(
  period: SalesReportPeriod,
): Promise<SalesDashboardData> {
  const currency = await fetchStoreCurrency().catch(() => "EUR");

  try {
    return {
      report: await fetchSalesReport(period),
      currency,
      source: "reports",
    };
  } catch {
    // Fall back to paid orders only when WooCommerce reports are unavailable.
    const orders = await fetchOrdersForPeriod(period);

    return {
      report: calculateSalesReportFromOrders(orders),
      currency: orders[0]?.currency || currency,
      source: "orders",
    };
  }
}

export async function fetchSalesReport(
  period: SalesReportPeriod,
): Promise<WooCommerceSalesReport> {
  const response = await fetch(getSalesReportUrl(period), {
    headers: {
      Authorization: getAuthorizationHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(
      `WooCommerce returned ${response.status}: ${response.statusText}`,
    );
  }

  const reports = (await response.json()) as WooCommerceSalesReport[];

  return (
    reports[0] ?? {
      total_sales: "0",
      net_sales: "0",
      total_orders: 0,
      total_items: 0,
      total_tax: "0",
      total_shipping: "0",
      total_refunds: "0",
      total_discount: "0",
    }
  );
}

export async function fetchStoreCurrency(): Promise<string> {
  const response = await fetch(getCurrencySettingUrl(), {
    headers: {
      Authorization: getAuthorizationHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(
      `WooCommerce returned ${response.status}: ${response.statusText}`,
    );
  }

  const setting = (await response.json()) as { value?: string };

  return setting.value || "EUR";
}

function getSalesReportDateRange(period: SalesReportPeriod): {
  start: string;
  end: string;
} {
  const now = new Date();
  const start = new Date(now);

  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  }

  return {
    start: formatDateParameter(start),
    end: formatDateParameter(now),
  };
}

function getSalesReportDateTimeRange(period: SalesReportPeriod): {
  start: string;
  end: string;
} {
  const now = new Date();
  const start = new Date(now);

  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  }

  return {
    start: start.toISOString(),
    end: now.toISOString(),
  };
}

async function fetchOrdersForPeriod(
  period: SalesReportPeriod,
): Promise<WooCommerceOrder[]> {
  const dateRange = getSalesReportDateTimeRange(period);
  const orders: WooCommerceOrder[] = [];
  let page = 1;

  while (page <= 20) {
    const pageOrders = await fetchOrders({
      after: dateRange.start,
      before: dateRange.end,
      page,
      perPage: 100,
    });

    orders.push(...pageOrders);

    if (pageOrders.length < 100) {
      break;
    }

    page += 1;
  }

  return orders.filter((order) =>
    ["completed", "processing", "on-hold"].includes(order.status),
  );
}

function calculateSalesReportFromOrders(
  orders: WooCommerceOrder[],
): WooCommerceSalesReport {
  const totals = orders.reduce(
    (totals, order) => {
      totals.totalSales += toNumber(order.total);
      totals.totalTax += toNumber(order.total_tax);
      totals.totalShipping += toNumber(order.shipping_total);
      totals.totalDiscount += toNumber(order.discount_total);
      totals.totalItems += order.line_items.reduce(
        (itemTotal, item) => itemTotal + item.quantity,
        0,
      );

      return totals;
    },
    {
      totalDiscount: 0,
      totalItems: 0,
      totalSales: 0,
      totalShipping: 0,
      totalTax: 0,
    },
  );

  const netSales = totals.totalSales - totals.totalTax - totals.totalShipping;

  return {
    total_sales: String(totals.totalSales),
    net_sales: String(netSales),
    total_orders: orders.length,
    total_items: totals.totalItems,
    total_tax: String(totals.totalTax),
    total_shipping: String(totals.totalShipping),
    total_refunds: "0",
    total_discount: String(totals.totalDiscount),
  };
}

function getWooCommerceApiUrl(path: string): URL {
  return new URL(
    `/wp-json/wc/v3${path}`,
    getSafeBaseUrl(getPreferences().storeUrl),
  );
}

function getSafeBaseUrl(url: string): URL {
  const parsedUrl = new URL(normalizeStoreUrl(url));

  if (!["https:", "http:"].includes(parsedUrl.protocol)) {
    throw new Error("Store URL must use HTTP or HTTPS.");
  }

  if (parsedUrl.protocol === "http:" && !isLocalhost(parsedUrl.hostname)) {
    // WooCommerce API credentials use Basic Auth, so public stores must use HTTPS.
    throw new Error(
      "Store URL must use HTTPS to protect WooCommerce API credentials.",
    );
  }

  return parsedUrl;
}

function isLocalhost(hostname: string): boolean {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function toNumber(value?: string): number {
  const number = Number(value ?? 0);

  return Number.isNaN(number) ? 0 : number;
}

function formatDateParameter(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
