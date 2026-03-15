import { FailedPayment, RevenueSnapshot } from "./types";

export const DEMO_PROJECT_ID = "demo-project";

export const demoRevenueSnapshot: RevenueSnapshot = {
  currency: "usd",
  todayRevenue: 18400,
  todayRevenueContext: "+12% vs yesterday",
  todayRevenueDelta: 12,
  mrr: 491200,
  mrrContext: "+2.1% this week",
  newCustomers: 6,
  newCustomersContext: "Today",
  failedPaymentsCount: 3,
  revenueAtRisk: 8400,
  generatedAt: new Date().toISOString(),
};

export const demoFailedPayments: FailedPayment[] = [
  {
    id: "in_demo_1",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    amount: 2900,
    currency: "usd",
    retryAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "retrying",
    reason: "Card declined",
    stripeUrl: "https://dashboard.stripe.com/test/invoices/in_demo_1",
    reviewed: false,
  },
  {
    id: "in_demo_2",
    customerName: "Acme Studio",
    customerEmail: "finance@acme.studio",
    amount: 3900,
    currency: "usd",
    retryAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "retrying",
    reason: "Insufficient funds",
    stripeUrl: "https://dashboard.stripe.com/test/invoices/in_demo_2",
    reviewed: false,
  },
  {
    id: "in_demo_3",
    customerName: "Northstar Labs",
    customerEmail: "ops@northstar.dev",
    amount: 1600,
    currency: "usd",
    retryAt: null,
    status: "final",
    reason: "Final payment attempt failed",
    stripeUrl: "https://dashboard.stripe.com/test/invoices/in_demo_3",
    reviewed: true,
  },
];
