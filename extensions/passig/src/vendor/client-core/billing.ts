// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
/**
 * Helper per i piani Free/Premium, condivisi da Chrome e Raycast (e specchiati in Swift/Dart).
 * Il server resta l'unica autorità: questi controlli servono solo a mostrare
 * messaggi chiari PRIMA di un'operazione che verrebbe rifiutata con 402.
 */
import { PLAN_WARNING_RATIO, formatPrice, type BillingStatus, type PlanErrorCode } from "../shared/index.js";
import type { ImportPlan } from "./import/plan.js";

export type PlanUsageLevel = "ok" | "warning" | "full";

/** Stato del contatore elementi: `warning` dall'80% del limite, `full` al limite (o oltre). */
export function itemUsageLevel(status: BillingStatus): PlanUsageLevel {
  const max = status.limits.maxItems;
  if (max === null) return "ok";
  if (status.usage.items >= max) return "full";
  if (status.usage.items >= Math.ceil(max * PLAN_WARNING_RATIO)) return "warning";
  return "ok";
}

export function canAddItems(status: BillingStatus, count = 1): boolean {
  const max = status.limits.maxItems;
  return max === null || status.usage.items + count <= max;
}

export function canCreatePersonalVault(status: BillingStatus): boolean {
  const max = status.limits.maxVaults;
  return max === null || status.usage.vaults + 1 <= max;
}

export const isTotpAllowed = (status: BillingStatus | null | undefined): boolean => status?.limits.totp ?? true;

const dateIt = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

/** Etichetta breve del piano, es. "Premium · prova fino al 16 novembre 2026". */
export function planLabel(status: BillingStatus): string {
  switch (status.source) {
    case "unlimited":
      return "Premium · illimitato";
    case "trial":
      return status.trialEndsAt ? `Premium · prova fino al ${dateIt(status.trialEndsAt)}` : "Premium · prova";
    case "grant":
      return status.grantedUntil ? `Premium · fino al ${dateIt(status.grantedUntil)}` : "Premium";
    case "stripe": {
      const sub = status.subscription;
      if (sub?.status === "past_due") return "Premium · pagamento da aggiornare";
      if (sub?.cancelAtPeriodEnd && sub.currentPeriodEnd) return `Premium · termina il ${dateIt(sub.currentPeriodEnd)}`;
      if (sub?.currentPeriodEnd) return `Premium · rinnovo il ${dateIt(sub.currentPeriodEnd)}`;
      return "Premium";
    }
    case "app_store":
    case "play_store": {
      const st = status.store;
      const via = status.source === "app_store" ? "App Store" : "Google Play";
      if (st?.status === "grace") return `Premium · ${via} · pagamento da aggiornare`;
      if (st?.expiresAt && (st.status === "canceled" || !st.autoRenew)) return `Premium · ${via} · termina il ${dateIt(st.expiresAt)}`;
      if (st?.expiresAt) return `Premium · ${via} · rinnovo il ${dateIt(st.expiresAt)}`;
      return `Premium · ${via}`;
    }
    default:
      return "Free";
  }
}

/** "37 / 50 elementi" oppure "37 elementi" se illimitato. */
export function itemUsageLabel(status: BillingStatus): string {
  const max = status.limits.maxItems;
  return max === null ? `${status.usage.items} elementi` : `${status.usage.items} / ${max} elementi`;
}

/** Testo del pulsante di acquisto, con il prezzo se disponibile. */
export function upgradeCta(status: BillingStatus): string {
  return status.price ? `Passa a Premium · ${formatPrice(status.price)}` : "Passa a Premium";
}

/**
 * true se ha senso proporre l'acquisto via Stripe (Free, prova o concesso; checkout configurato).
 * Chi ha già un abbonamento (Stripe o in-app) non vede l'offerta.
 */
export function shouldOfferUpgrade(status: BillingStatus): boolean {
  return status.checkoutAvailable && (status.source === "free" || status.source === "trial" || status.source === "grant");
}

/** Elenco dei vantaggi Premium per la UI di upgrade. */
export const PREMIUM_FEATURES: readonly string[] = [
  "Elementi illimitati",
  "Più vault personali",
  "Condivisione con altre persone",
  "Codici di verifica TOTP integrati",
  "Organizzazioni per famiglia e team",
];

/** Messaggio da mostrare per un errore 402 (se il server non ne ha fornito uno). */
export function planErrorMessage(code: PlanErrorCode | string): string {
  switch (code) {
    case "PLAN_LIMIT_ITEMS":
      return "Hai raggiunto il limite di elementi del piano Free. Le password esistenti restano sempre accessibili.";
    case "PLAN_LIMIT_VAULTS":
      return "Il piano Free include un solo vault personale.";
    case "PLAN_FEATURE_SHARING":
      return "La condivisione dei vault è inclusa in Premium.";
    case "PLAN_FEATURE_ORGANIZATIONS":
      return "Le organizzazioni sono incluse in Premium.";
    default:
      return "Funzione inclusa in Premium.";
  }
}

export type PlanCheck = { ok: true } | { ok: false; code: PlanErrorCode; message: string };

/**
 * Verifica preventiva di un import: conta gli elementi destinati ai vault personali
 * (esistenti di tua proprietà o nuovi) e i vault da creare.
 * `personalVaultIds`: id dei vault personali creati dall'utente (organizationId = null, ruolo owner).
 */
export function checkImportAgainstPlan(status: BillingStatus, plan: ImportPlan, personalVaultIds: ReadonlySet<string>): PlanCheck {
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
      message:
        newVaults > 1
          ? `Questo import crea ${newVaults} vault, ma il piano Free ne include ${maxVaults}. Importa tutto in un unico vault oppure passa a Premium.`
          : `Il piano Free include ${maxVaults} vault personale: importa nel vault esistente oppure passa a Premium.`,
    };
  }
  const maxItems = status.limits.maxItems;
  if (maxItems !== null && status.usage.items + items > maxItems) {
    const free = Math.max(0, maxItems - status.usage.items);
    return {
      ok: false,
      code: "PLAN_LIMIT_ITEMS",
      message: `Stai importando ${items} elementi ma il piano Free ne consente ancora ${free} (limite ${maxItems}). Passa a Premium per importarli tutti: nessun elemento verrà scartato.`,
    };
  }
  return { ok: true };
}
