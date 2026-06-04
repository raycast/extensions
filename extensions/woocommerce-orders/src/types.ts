export type Preferences = {
  storeUrl: string;
  wordpressUrl?: string;
  consumerKey: string;
  consumerSecret: string;
  ordersPerPage: string;
};

export type WooCommerceOrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed"
  | "checkout-draft"
  | string;

export type WooCommerceOrder = {
  id: number;
  number: string;
  status: WooCommerceOrderStatus;
  currency: string;
  total: string;
  total_tax?: string;
  shipping_total?: string;
  discount_total?: string;
  date_created: string;
  customer_note?: string;
  billing: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    email?: string;
    phone?: string;
  };
  shipping: {
    first_name?: string;
    last_name?: string;
    company?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    total: string;
    sku?: string;
  }>;
};

export type SalesReportPeriod = "today" | "week";

export type WooCommerceSalesReport = {
  total_sales: string;
  net_sales: string;
  total_orders: number;
  total_items: number;
  total_tax: string;
  total_shipping: string;
  total_refunds: string;
  total_discount: string;
};

export type SalesDashboardData = {
  report: WooCommerceSalesReport;
  currency: string;
  source: "reports" | "orders";
};
