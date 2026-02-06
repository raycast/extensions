import { MercuryApi } from "./api";
import type { FeatureCapabilities } from "./types";

// ─── Feature Keys & Labels ──────────────────────────────────────────────────

export const FEATURES = {
  accounts: "accounts",
  transactions: "transactions",
  cards: "cards",
  recipients: "recipients",
  payments: "payments",
  invoices: "invoices",
  customers: "customers",
  organization: "organization",
  team: "team",
  treasury: "treasury",
  credit: "credit",
  statements: "statements",
  categories: "categories",
  events: "events",
  webhooks: "webhooks",
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  accounts: "Accounts",
  transactions: "Transactions",
  cards: "Cards",
  recipients: "Recipients",
  payments: "Payments",
  invoices: "Invoices",
  customers: "Customers",
  organization: "Organization",
  team: "Team Members",
  treasury: "Treasury",
  credit: "Credit",
  statements: "Statements",
  categories: "Categories",
  events: "Events",
  webhooks: "Webhooks",
};

// ─── Probing ────────────────────────────────────────────────────────────────

function isProbeError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("403") || msg.includes("401");
}

export async function probeFeatures(
  apiKey: string,
): Promise<FeatureCapabilities> {
  const api = new MercuryApi(apiKey);
  const detected: Record<string, boolean> = {};

  // Phase 1: Probe independent endpoints in parallel
  const phase1 = await Promise.allSettled([
    api
      .getAccounts()
      .then(() => ({ key: "accounts", ok: true }))
      .catch((e) => ({ key: "accounts", ok: !isProbeError(e) })),
    api
      .getRecipients()
      .then(() => ({ key: "recipients", ok: true }))
      .catch((e) => ({ key: "recipients", ok: !isProbeError(e) })),
    api
      .getInvoices()
      .then(() => ({ key: "invoices", ok: true }))
      .catch((e) => ({ key: "invoices", ok: !isProbeError(e) })),
    api
      .getCustomers()
      .then(() => ({ key: "customers", ok: true }))
      .catch((e) => ({ key: "customers", ok: !isProbeError(e) })),
    api
      .getOrganization()
      .then(() => ({ key: "organization", ok: true }))
      .catch((e) => ({ key: "organization", ok: !isProbeError(e) })),
    api
      .getTeamMembers()
      .then(() => ({ key: "team", ok: true }))
      .catch((e) => ({ key: "team", ok: !isProbeError(e) })),
    api
      .getTreasury()
      .then(() => ({ key: "treasury", ok: true }))
      .catch((e) => ({ key: "treasury", ok: !isProbeError(e) })),
    api
      .getCredit()
      .then(() => ({ key: "credit", ok: true }))
      .catch((e) => ({ key: "credit", ok: !isProbeError(e) })),
    api
      .getCategories()
      .then(() => ({ key: "categories", ok: true }))
      .catch((e) => ({ key: "categories", ok: !isProbeError(e) })),
    api
      .getEvents(1)
      .then(() => ({ key: "events", ok: true }))
      .catch((e) => ({ key: "events", ok: !isProbeError(e) })),
    api
      .getWebhooks()
      .then(() => ({ key: "webhooks", ok: true }))
      .catch((e) => ({ key: "webhooks", ok: !isProbeError(e) })),
  ]);

  for (const result of phase1) {
    if (result.status === "fulfilled") {
      detected[result.value.key] = result.value.ok;
    }
  }

  // Phase 2: Account-dependent probes (cards, statements)
  if (detected.accounts) {
    try {
      const accounts = await api.getAccounts();
      const active = accounts.find((a) => a.status === "active");
      if (active) {
        const [cardsResult, statementsResult] = await Promise.allSettled([
          api
            .getCards(active.id)
            .then(() => true)
            .catch((e) => !isProbeError(e)),
          api
            .getStatements(active.id)
            .then(() => true)
            .catch((e) => !isProbeError(e)),
        ]);
        detected.cards =
          cardsResult.status === "fulfilled" ? cardsResult.value : true;
        detected.statements =
          statementsResult.status === "fulfilled"
            ? statementsResult.value
            : true;
      } else {
        detected.cards = true;
        detected.statements = true;
      }
    } catch {
      detected.cards = true;
      detected.statements = true;
    }
  } else {
    detected.cards = true;
    detected.statements = true;
  }

  // Derived features
  detected.transactions = detected.accounts;
  detected.payments = detected.accounts && detected.recipients;

  return { detected, overrides: {}, probedAt: new Date().toISOString() };
}

// ─── Resolution ─────────────────────────────────────────────────────────────

const CORE_FEATURES: Set<string> = new Set(["accounts", "transactions"]);

export function isFeatureEnabled(
  capabilities: FeatureCapabilities | undefined,
  feature: FeatureKey,
): boolean {
  if (!capabilities) return true;

  if (CORE_FEATURES.has(feature)) {
    return capabilities.detected[feature] ?? true;
  }

  if (capabilities.overrides[feature] !== undefined) {
    return capabilities.overrides[feature];
  }

  return capabilities.detected[feature] ?? true;
}

// ─── Access Error Helper ────────────────────────────────────────────────────

export function isAccessError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("403") || msg.includes("401");
}