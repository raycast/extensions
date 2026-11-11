/**
 * Free/Premium plan labels. Mirrors the helpers in `client-core/billing.ts`
 * (planLabel, itemUsageLabel, upgradeCta, PREMIUM_FEATURES, planErrorMessage,
 * checkImportAgainstPlan), whose texts are not in English: the logic stays in the
 * shared package, only the wording lives here.
 */
import type { ImportPlan } from "../vendor/client-core/index.js";
import type { BillingStatus, PlanErrorCode } from "../vendor/shared/index.js";
import { formatCurrency, formatDate, t } from "./text";

type BillingPrice = NonNullable<BillingStatus["price"]>;

/** Name of the store that manages the subscription, null when it is not an in-app purchase. */
export function storeName(billing: BillingStatus): string | null {
  if (billing.source === "app_store") return "App Store";
  if (billing.source === "play_store") return "Google Play";
  return null;
}

export function formatPrice(p: BillingPrice): string {
  const amount = formatCurrency(p.unitAmount / 100, p.currency);
  const key = { day: "price.day", week: "price.week", month: "price.month", year: "price.year" } as const;
  return t(key[p.interval], { amount });
}

/** Short plan label, e.g. "Premium · trial until November 16, 2026". */
export function planLabel(status: BillingStatus): string {
  switch (status.source) {
    case "unlimited":
      return t("plan.premiumUnlimited");
    case "trial":
      return status.trialEndsAt ? t("plan.trialUntil", { date: formatDate(status.trialEndsAt) }) : t("plan.trial");
    case "grant":
      return status.grantedUntil ? t("plan.grantUntil", { date: formatDate(status.grantedUntil) }) : "Premium";
    case "stripe": {
      const sub = status.subscription;
      if (sub?.status === "past_due") return t("plan.pastDue");
      if (sub?.cancelAtPeriodEnd && sub.currentPeriodEnd)
        return t("plan.endsOn", { date: formatDate(sub.currentPeriodEnd) });
      if (sub?.currentPeriodEnd) return t("plan.renewsOn", { date: formatDate(sub.currentPeriodEnd) });
      return "Premium";
    }
    case "app_store":
    case "play_store": {
      const st = status.store;
      const store = storeName(status)!;
      if (st?.status === "grace") return t("plan.storePastDue", { store });
      if (st?.expiresAt && (st.status === "canceled" || !st.autoRenew))
        return t("plan.storeEndsOn", { store, date: formatDate(st.expiresAt) });
      if (st?.expiresAt) return t("plan.storeRenewsOn", { store, date: formatDate(st.expiresAt) });
      return t("plan.store", { store });
    }
    default:
      return "Free";
  }
}

/** "37 / 50 items", or "37 items" when unlimited. */
export function itemUsageLabel(status: BillingStatus): string {
  const max = status.limits.maxItems;
  return max === null
    ? t("plan.itemUsage", { count: status.usage.items })
    : t("plan.itemUsageOf", { used: status.usage.items, max });
}

/** Upgrade button title, with the price when available. */
export function upgradeCta(status: BillingStatus): string {
  return status.price ? t("plan.upgradeWithPrice", { price: formatPrice(status.price) }) : t("plan.upgrade");
}

export function premiumFeatures(): string[] {
  return [
    t("plan.feature.items"),
    t("plan.feature.vaults"),
    t("plan.feature.sharing"),
    t("plan.feature.totp"),
    t("plan.feature.organizations"),
  ];
}

/** Message for a 402 error (when the server did not provide one). */
export function planErrorMessage(code: PlanErrorCode | string): string {
  switch (code) {
    case "PLAN_LIMIT_ITEMS":
      return t("planError.items");
    case "PLAN_LIMIT_VAULTS":
      return t("planError.vaults");
    case "PLAN_FEATURE_SHARING":
      return t("planError.sharing");
    case "PLAN_FEATURE_ORGANIZATIONS":
      return t("planError.organizations");
    default:
      return t("planError.generic");
  }
}

export type PlanCheck = { ok: true } | { ok: false; code: PlanErrorCode; message: string };

/** Same as client-core's `checkImportAgainstPlan`, with English messages. */
export function checkImportAgainstPlan(
  status: BillingStatus,
  plan: ImportPlan,
  personalVaultIds: ReadonlySet<string>,
): PlanCheck {
  let newVaults = 0;
  let items = 0;
  for (const b of plan.batches) {
    if (!b.vaultId) {
      newVaults++;
      items += b.items.length;
    } else if (personalVaultIds.has(b.vaultId)) {
      items += b.items.length;
    }
  }
  const maxVaults = status.limits.maxVaults;
  if (newVaults > 0 && maxVaults !== null && status.usage.vaults + newVaults > maxVaults) {
    return {
      ok: false,
      code: "PLAN_LIMIT_VAULTS",
      message: t("importPlan.vaults", { count: newVaults, max: maxVaults }),
    };
  }
  const maxItems = status.limits.maxItems;
  // organization vaults don't count: an import that adds no personal items is never blocked
  if (items > 0 && maxItems !== null && status.usage.items + items > maxItems) {
    const free = Math.max(0, maxItems - status.usage.items);
    return {
      ok: false,
      code: "PLAN_LIMIT_ITEMS",
      message: t("importPlan.items", { count: items, free, max: maxItems }),
    };
  }
  return { ok: true };
}

/** Label for the strength score (0-4) returned by `passwordStrength`. */
export function strengthLabel(score: number): string {
  const keys = ["strength.0", "strength.1", "strength.2", "strength.3", "strength.4"] as const;
  return t(keys[Math.min(Math.max(score, 0), 4)]!);
}
