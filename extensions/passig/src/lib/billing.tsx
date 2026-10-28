/**
 * Piano Free/Premium in Raycast.
 *
 * Il server resta l'unica autorità (402 su ogni operazione oltre il piano): qui lo stato
 * serve solo a mostrare messaggi chiari prima. Ogni comando rilegge `GET /billing/status`
 * all'apertura; l'ultimo valore resta in `Cache` per mostrarlo subito. Se la chiamata
 * fallisce (server vecchio, offline) lo stato è `null` e tutto funziona come prima.
 */
import { Action, ActionPanel, Cache, Detail, Icon, Toast, open, showToast, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { shouldOfferUpgrade, type VaultSession } from "../vendor/client-core/index.js";
import type { BillingStatus } from "../vendor/shared/index.js";
import { formatNumber, t } from "../i18n";
import { describeError } from "./errors";
import { itemUsageLabel, planLabel, premiumFeatures, storeName, upgradeCta } from "./plan";
import type { ActiveSession } from "./session";

export { storeName };

const cache = new Cache({ namespace: "passig" });
const CACHE_BILLING = "billing";

function readCachedBilling(): BillingStatus | null {
  const raw = cache.get(CACHE_BILLING);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BillingStatus;
  } catch {
    return null;
  }
}

export async function fetchBilling(session: ActiveSession): Promise<BillingStatus | null> {
  try {
    const status = await session.api.billingStatus();
    cache.set(CACHE_BILLING, JSON.stringify(status));
    return status;
  } catch {
    cache.remove(CACHE_BILLING);
    return null;
  }
}

/** Stato del piano: valore in cache subito, poi riletto dal server. */
export function useBilling(session: ActiveSession) {
  const [billing, setBilling] = useState<BillingStatus | null>(() => readCachedBilling());
  const reload = useCallback(async () => {
    const next = await fetchBilling(session);
    setBilling(next);
    return next;
  }, [session]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { billing, reload };
}

/** Id dei vault personali creati dall'utente (organizationId null, ruolo owner): contano nei limiti. */
export function personalVaultIds(vault: VaultSession): Set<string> {
  return new Set(
    vault
      .listVaults()
      .filter((v) => v.organizationId === null && v.role === "owner")
      .map((v) => v.id),
  );
}

/** Apre Stripe Checkout nel browser di sistema. */
export async function openCheckout(session: ActiveSession): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: t("billing.openingCheckout") });
  try {
    const { url } = await session.api.createCheckout();
    await open(url);
    await toast.hide();
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = t("billing.checkoutFailed");
    toast.message = describeError(err);
  }
}

/** Apre il Customer Portal di Stripe (pagamento, fatture, disdetta). */
export async function openBillingPortal(session: ActiveSession): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: t("billing.opening") });
  try {
    const { url } = await session.api.createBillingPortal();
    await open(url);
    await toast.hide();
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = t("billing.portalFailed");
    toast.message = describeError(err);
  }
}

/** Azioni «Passa a Premium» / «Gestisci abbonamento», solo quando hanno senso. */
export function BillingActions({ session, billing }: { session: ActiveSession; billing: BillingStatus | null }) {
  if (!billing) return null;
  // abbonamento in-app: si gestisce solo dallo store, niente checkout né portale Stripe
  if (storeName(billing)) return null;
  return (
    <>
      {shouldOfferUpgrade(billing) && (
        <Action title={upgradeCta(billing)} icon={Icon.Star} onAction={() => openCheckout(session)} />
      )}
      {billing.portalAvailable && (
        <Action title={t("billing.manage")} icon={Icon.CreditCard} onAction={() => openBillingPortal(session)} />
      )}
    </>
  );
}

/** Dettaglio «Piano Passig». */
export function PlanDetail({ session, initial }: { session: ActiveSession; initial?: BillingStatus | null }) {
  const [billing, setBilling] = useState<BillingStatus | null | undefined>(initial ?? undefined);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setBilling(await fetchBilling(session));
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (billing === undefined) return <Detail isLoading navigationTitle={t("common.planDetail")} markdown="" />;
  if (billing === null) {
    return (
      <Detail
        isLoading={loading}
        navigationTitle={t("common.planDetail")}
        markdown={`# ${t("common.planDetail")}\n\n${t("plan.noInfo")}`}
        actions={
          <ActionPanel>
            <Action title={t("common.refresh")} icon={Icon.ArrowClockwise} onAction={reload} />
          </ActionPanel>
        }
      />
    );
  }

  const vaults =
    billing.limits.maxVaults === null
      ? formatNumber(billing.usage.vaults)
      : `${formatNumber(billing.usage.vaults)} / ${formatNumber(billing.limits.maxVaults)}`;
  const lines = [`# ${planLabel(billing)}`, "", t("plan.usageLine", { items: itemUsageLabel(billing), vaults }), ""];
  if (billing.plan === "free") {
    lines.push(t("plan.freeNote"), "");
  }
  const store = storeName(billing);
  if (store) {
    lines.push(t("plan.managedBy", { store }), "");
  } else if (billing.source !== "stripe" && billing.source !== "unlimited") {
    lines.push(`## ${t("plan.withPremium")}`, "", ...premiumFeatures().map((f) => `- ${f}`), "");
  }

  return (
    <Detail
      isLoading={loading}
      navigationTitle={t("common.planDetail")}
      markdown={lines.join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={t("plan.label")} text={billing.plan === "premium" ? "Premium" : "Free"} />
          {store && <Detail.Metadata.Label title={t("plan.subscription")} text={t("plan.managedByShort", { store })} />}
          <Detail.Metadata.Label title={t("plan.items")} text={itemUsageLabel(billing)} />
          <Detail.Metadata.Label title={t("plan.personalVaults")} text={vaults} />
          <Detail.Metadata.Label
            title={t("plan.totpCodes")}
            text={billing.limits.totp ? t("plan.included") : t("plan.withPremiumShort")}
          />
          <Detail.Metadata.Label
            title={t("plan.sharing")}
            text={billing.limits.sharing ? t("plan.included") : t("plan.withPremiumShort")}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <BillingActions session={session} billing={billing} />
          <Action
            title={t("common.refresh")}
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={reload}
          />
        </ActionPanel>
      }
    />
  );
}
