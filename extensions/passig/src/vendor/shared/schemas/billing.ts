// GENERATED from packages/ by the Passig monorepo — do not edit by hand.
import { z } from "zod";
import { IsoDate } from "./common.js";

// ---------- Piani ----------
//
// Free: tutto il necessario per chi ha poche password (sync, autofill, import/export su tutti i dispositivi).
// Premium: nessun limite + funzioni avanzate. Le regole valgono per i vault PERSONALI (organizationId = null)
// e si applicano a chi ha creato il vault: i vault di organizzazione non hanno limiti (piano Team futuro),
// ma creare un'organizzazione richiede Premium.
//
// Regola d'oro: un utente non perde MAI l'accesso ai propri dati. Oltre il limite si può leggere, modificare,
// eliminare, ripristinare ed esportare; si bloccano solo nuove creazioni e le funzioni Premium.

export const PlanId = z.enum(["free", "premium"]);
export type PlanId = z.infer<typeof PlanId>;

/**
 * Da dove arriva il piano effettivo:
 * - `free`      nessun diritto attivo
 * - `trial`     prova gratuita (alla registrazione)
 * - `stripe`    abbonamento Stripe attivo
 * - `app_store` abbonamento in-app Apple (iOS) attivo
 * - `play_store` abbonamento in-app Google Play (Android) attivo
 * - `grant`     concesso dall'amministratore fino a una data
 * - `unlimited` amministratori di piattaforma o billing disattivato (self-hosting)
 */
export const PlanSource = z.enum(["free", "trial", "stripe", "app_store", "play_store", "grant", "unlimited"]);
export type PlanSource = z.infer<typeof PlanSource>;

export const PlanLimits = z.object({
  /** null = illimitati */
  maxItems: z.number().int().nullable(),
  maxVaults: z.number().int().nullable(),
  /** condivisione dei vault personali con altre persone */
  sharing: z.boolean(),
  /** creazione di organizzazioni */
  organizations: z.boolean(),
  /** generazione dei codici TOTP (il segreto resta sempre visibile e copiabile) */
  totp: z.boolean(),
});
export type PlanLimits = z.infer<typeof PlanLimits>;

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { maxItems: 50, maxVaults: 1, sharing: false, organizations: false, totp: false },
  premium: { maxItems: null, maxVaults: null, sharing: true, organizations: true, totp: true },
};

/** Soglia (frazione del limite) oltre la quale i client mostrano un avviso discreto. */
export const PLAN_WARNING_RATIO = 0.8;

export const SubscriptionStatus = z.enum([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const BillingPrice = z.object({
  /** importo in centesimi */
  unitAmount: z.number().int(),
  currency: z.string(),
  interval: z.enum(["day", "week", "month", "year"]),
});

export const StorePlatform = z.enum(["app_store", "play_store"]);
export type StorePlatform = z.infer<typeof StorePlatform>;

/**
 * Stato normalizzato di un abbonamento in-app:
 * `active` rinnovo attivo · `grace` periodo di tolleranza dopo un addebito fallito · `canceled` rinnovo disattivato
 * ma valido fino a `expiresAt` · `billing_retry` / `on_hold` addebito fallito, senza accesso · `paused` · `pending`
 * · `expired` · `revoked` (rimborsato/revocato).
 */
export const StoreSubscriptionStatus = z.enum(["active", "grace", "canceled", "billing_retry", "on_hold", "paused", "pending", "expired", "revoked"]);
export type StoreSubscriptionStatus = z.infer<typeof StoreSubscriptionStatus>;

export const StoreSubscriptionInfo = z.object({
  platform: StorePlatform,
  productId: z.string(),
  status: StoreSubscriptionStatus,
  expiresAt: IsoDate.nullable(),
  autoRenew: z.boolean(),
  /** true per gli acquisti di test (sandbox Apple / tester di licenza Google) */
  sandbox: z.boolean(),
});

/** ID prodotto configurati sul server per gli acquisti in-app (null = non vendibile su quella piattaforma). */
export const StoreProducts = z.object({
  appStore: z.string().nullable(),
  playStore: z.string().nullable(),
  /** app Mac App Store (record separato, bundle e prodotto propri) */
  macAppStore: z.string().nullable(),
});

export const BillingStatus = z.object({
  plan: PlanId,
  source: PlanSource,
  limits: PlanLimits,
  usage: z.object({ items: z.number().int(), vaults: z.number().int() }),
  /** fine della prova (anche se già scaduta), null se mai avuta */
  trialEndsAt: IsoDate.nullable(),
  /** premium concesso dall'admin fino a questa data */
  grantedUntil: IsoDate.nullable(),
  subscription: z
    .object({
      status: SubscriptionStatus,
      currentPeriodEnd: IsoDate.nullable(),
      cancelAtPeriodEnd: z.boolean(),
    })
    .nullable(),
  /** true se l'acquisto via Stripe è configurato sul server */
  checkoutAvailable: z.boolean(),
  /** true se l'utente ha un cliente Stripe (può aprire il portale di gestione) */
  portalAvailable: z.boolean(),
  price: BillingPrice.nullable(),
  /** abbonamento in-app che dà (o ha dato) Premium, il più rilevante */
  store: StoreSubscriptionInfo.nullable(),
  storeProducts: StoreProducts,
});
export type BillingStatus = z.infer<typeof BillingStatus>;

export const BillingUrlResponse = z.object({ url: z.string().url() });

/** iOS: id della transazione StoreKit (`purchaseID` / `Transaction.id`). Il server la rilegge dalla App Store Server API. */
export const AppStoreVerifyRequest = z.object({
  transactionId: z.string().regex(/^\d{1,32}$/, "transactionId numerico atteso"),
  /** app che ha fatto l'acquisto: iOS (default) o Mac App Store */
  app: z.enum(["ios", "macos"]).default("ios"),
});

/** Android: token d'acquisto Google Play. Il server lo rilegge dalla Google Play Developer API e lo conferma (acknowledge). */
export const PlayStoreVerifyRequest = z.object({
  productId: z.string().min(1).max(200),
  purchaseToken: z.string().min(10).max(4096),
});

/** Codici di errore (HTTP 402) restituiti quando un'operazione supera il piano. `details` = PlanLimitDetails. */
/** Errori della verifica di un acquisto in-app (HTTP 400/409/503). */
export const StoreErrorCode = z.enum([
  "STORE_NOT_CONFIGURED",
  "STORE_PURCHASE_NOT_FOUND",
  "STORE_PURCHASE_INVALID",
  "STORE_PURCHASE_OTHER_ACCOUNT",
  "STORE_UNREACHABLE",
]);

export const PlanErrorCode = z.enum([
  "PLAN_LIMIT_ITEMS",
  "PLAN_LIMIT_VAULTS",
  "PLAN_FEATURE_SHARING",
  "PLAN_FEATURE_ORGANIZATIONS",
]);
export type PlanErrorCode = z.infer<typeof PlanErrorCode>;

export const PlanLimitDetails = z.object({
  limit: z.number().int().nullable(),
  current: z.number().int(),
  requested: z.number().int(),
});

// ---------- Admin ----------

export const AdminGrantPremiumRequest = z.object({
  /** null = revoca la concessione */
  until: IsoDate.nullable(),
});

export const AdminUserBilling = BillingStatus.extend({
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
});

/** Utile per mostrare il prezzo: "10,00 € / anno". */
export function formatPrice(p: z.infer<typeof BillingPrice>, locale = "it-IT"): string {
  const amount = new Intl.NumberFormat(locale, { style: "currency", currency: p.currency.toUpperCase() }).format(p.unitAmount / 100);
  const per = { day: "giorno", week: "settimana", month: "mese", year: "anno" }[p.interval];
  return `${amount} / ${per}`;
}
