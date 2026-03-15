import { withShortLivedCache } from "./cache";
import { demoFailedPayments, demoRevenueSnapshot } from "./demo-data";
import {
  listCustomers,
  listOpenInvoices,
  listPaymentIntents,
  listSubscriptions,
  StripeInvoice,
  StripeSubscription,
} from "./stripe";
import { FailedPayment, RevenueSnapshot, StripeProject } from "./types";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);
const SNAPSHOT_CACHE_TTL_MS = 30_000;
const FAILED_PAYMENTS_CACHE_TTL_MS = 15_000;

type RevenueSnapshotInputs = {
  subscriptions: StripeSubscription[];
  todayPaymentIntents: Array<{
    status: string;
    amount: number;
    amount_received: number;
    currency: string;
  }>;
  yesterdayPaymentIntents: Array<{
    status: string;
    amount: number;
    amount_received: number;
    currency: string;
  }>;
  customers: Array<{ id: string }>;
  failedPayments: FailedPayment[];
};

function getLocalDayBoundary(offsetInDays = 0) {
  const now = new Date();
  return Math.floor(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + offsetInDays,
    ).getTime() / 1000,
  );
}

export function calculateMRR(subscriptions: StripeSubscription[]) {
  return subscriptions.reduce((total, subscription) => {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      return total;
    }

    const subscriptionMRR = subscription.items.data.reduce((sum, item) => {
      const recurring = item.price.recurring;
      const amount = item.price.unit_amount ?? 0;

      if (!recurring || !amount) {
        return sum;
      }

      const intervalCount = Math.max(recurring.interval_count, 1);

      switch (recurring.interval) {
        case "month":
          return sum + amount / intervalCount;
        case "year":
          return sum + amount / (12 * intervalCount);
        case "week":
          return sum + amount * (52 / 12 / intervalCount);
        case "day":
          return sum + amount * (365 / 12 / intervalCount);
        default:
          return sum;
      }
    }, 0);

    return total + subscriptionMRR;
  }, 0);
}

export function sumSucceededPaymentIntents(
  paymentIntents: Array<{
    status: string;
    amount: number;
    amount_received: number;
  }>,
) {
  return paymentIntents.reduce((total, paymentIntent) => {
    if (paymentIntent.status !== "succeeded") {
      return total;
    }

    return total + (paymentIntent.amount_received || paymentIntent.amount);
  }, 0);
}

export function calculatePercentDelta(
  currentValue: number,
  previousValue: number,
) {
  if (previousValue === 0) {
    return null;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

export function normalizeFailedInvoice(
  invoice: StripeInvoice,
  project: StripeProject,
): FailedPayment {
  const status = invoice.next_payment_attempt ? "retrying" : "final";

  return {
    id: invoice.id,
    customerName:
      invoice.customer_name || invoice.customer_email || "Unknown customer",
    customerEmail: invoice.customer_email || "No email on invoice",
    amount: invoice.amount_due,
    currency: invoice.currency || "usd",
    retryAt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toISOString()
      : null,
    status,
    reason:
      invoice.payment_intent?.last_payment_error?.message ||
      (status === "retrying" ? "Retry pending" : "Payment failed"),
    stripeUrl:
      invoice.hosted_invoice_url ||
      `${project.dashboardUrl}/invoices/${invoice.id}`,
    reviewed: false,
  };
}

export function buildRevenueSnapshot(
  inputs: RevenueSnapshotInputs,
): RevenueSnapshot {
  const todayRevenue = sumSucceededPaymentIntents(inputs.todayPaymentIntents);
  const yesterdayRevenue = sumSucceededPaymentIntents(
    inputs.yesterdayPaymentIntents,
  );
  const revenueAtRisk = inputs.failedPayments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const currency =
    inputs.subscriptions[0]?.items.data[0]?.price.currency ||
    inputs.todayPaymentIntents[0]?.currency ||
    inputs.failedPayments[0]?.currency ||
    "usd";

  return {
    currency,
    todayRevenue,
    todayRevenueContext:
      todayRevenue > 0
        ? `${inputs.todayPaymentIntents.filter((paymentIntent) => paymentIntent.status === "succeeded").length} successful payments today`
        : "No successful payments yet today",
    todayRevenueDelta: calculatePercentDelta(todayRevenue, yesterdayRevenue),
    mrr: Math.round(calculateMRR(inputs.subscriptions)),
    mrrContext: `${inputs.subscriptions.filter((subscription) => ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)).length} active subscriptions`,
    newCustomers: inputs.customers.length,
    newCustomersContext: "Today",
    failedPaymentsCount: inputs.failedPayments.length,
    revenueAtRisk,
    generatedAt: new Date().toISOString(),
  };
}

async function getLiveFailedPayments(
  project: StripeProject,
  signal?: AbortSignal,
) {
  const invoices = await listOpenInvoices(project.secretKey, { signal });

  return invoices
    .filter((invoice) => invoice.amount_due > 0 && invoice.attempt_count > 0)
    .map((invoice) => normalizeFailedInvoice(invoice, project));
}

export async function getRevenueSnapshot(
  project: StripeProject,
  options?: { signal?: AbortSignal; forceRefresh?: boolean },
): Promise<RevenueSnapshot> {
  if (project.isDemo) {
    return {
      ...demoRevenueSnapshot,
      generatedAt: new Date().toISOString(),
    };
  }

  return withShortLivedCache(
    `revenue-snapshot:${project.id}`,
    async () => {
      const startOfToday = getLocalDayBoundary(0);
      const startOfTomorrow = getLocalDayBoundary(1);
      const startOfYesterday = getLocalDayBoundary(-1);

      const [
        subscriptions,
        todayPaymentIntents,
        yesterdayPaymentIntents,
        customers,
        failedPayments,
      ] = await Promise.all([
        listSubscriptions(project.secretKey, { signal: options?.signal }),
        listPaymentIntents(
          project.secretKey,
          { gte: startOfToday, lt: startOfTomorrow },
          { signal: options?.signal },
        ),
        listPaymentIntents(
          project.secretKey,
          { gte: startOfYesterday, lt: startOfToday },
          { signal: options?.signal },
        ),
        listCustomers(
          project.secretKey,
          { gte: startOfToday, lt: startOfTomorrow },
          { signal: options?.signal },
        ),
        getFailedPayments(project, options),
      ]);

      return buildRevenueSnapshot({
        subscriptions,
        todayPaymentIntents,
        yesterdayPaymentIntents,
        customers,
        failedPayments,
      });
    },
    { ttlMs: SNAPSHOT_CACHE_TTL_MS, forceRefresh: options?.forceRefresh },
  );
}

export async function getFailedPayments(
  project: StripeProject,
  options?: { signal?: AbortSignal; forceRefresh?: boolean },
) {
  if (project.isDemo) {
    return demoFailedPayments.map((payment) => ({ ...payment }));
  }

  return withShortLivedCache(
    `failed-payments:${project.id}`,
    () => getLiveFailedPayments(project, options?.signal),
    {
      ttlMs: FAILED_PAYMENTS_CACHE_TTL_MS,
      forceRefresh: options?.forceRefresh,
    },
  );
}
