import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  closeMainWindow,
  showHUD,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  displayHost,
  generateTotp,
  isTotpAllowed,
  itemUsageLevel,
  shouldOfferUpgrade,
  type DecryptedItem,
} from "./vendor/client-core/index.js";
import type { BillingStatus } from "./vendor/shared/index.js";
import { UnlockForm } from "./components/UnlockForm";
import { formatDateTime, t } from "./lib/text";
import { copySecret } from "./lib/clipboard";
import { describeError } from "./lib/errors";
import { BillingActions, PlanDetail, openCheckout, useBilling } from "./lib/billing";
import { planLabel, upgradeCta } from "./lib/plan";
import type { ActiveSession } from "./lib/session";
import { useSession } from "./lib/useSession";

export default function SearchCommand() {
  const { session, setSession, loading } = useSession();
  if (loading) return <List isLoading searchBarPlaceholder={t("common.loading")} />;
  if (!session) return <UnlockForm onUnlocked={setSession} />;
  return <SearchList session={session} onLock={() => setSession(null)} />;
}

function SearchList({ session, onLock }: { session: ActiveSession; onLock: () => void }) {
  const [query, setQuery] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [tick, setTick] = useState(0); // forces a re-render after a refresh
  const [refreshing, setRefreshing] = useState(false);
  const { billing } = useBilling(session);
  const totpAllowed = isTotpAllowed(billing);
  const usageLevel = billing ? itemUsageLevel(billing) : "ok";

  // Refresh from the server in the background on open (stored items show right away).
  useEffect(() => {
    let cancelled = false;
    setRefreshing(true);
    session
      .refresh()
      .catch((err) =>
        showToast({ style: Toast.Style.Failure, title: t("search.refreshFailed"), message: describeError(err) }),
      )
      .finally(() => {
        if (!cancelled) {
          setRefreshing(false);
          setTick((t) => t + 1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  /** Manual refresh: reloads from the server and recomputes the results (tick). */
  async function refresh() {
    if (session.isExpired()) {
      onLock();
      return;
    }
    setRefreshing(true);
    try {
      await session.refresh();
      setTick((t) => t + 1);
      await showToast({ style: Toast.Style.Success, title: t("search.vaultRefreshed") });
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: t("search.refreshFailed"), message: describeError(err) });
    } finally {
      setRefreshing(false);
    }
  }

  const results = useMemo(() => session.vault.search(query, 200), [session, query, tick]);
  const byVault = useMemo(() => {
    // With an active query results stay in a single section, in relevance order
    // (title matches first): grouping them by vault would break that order.
    if (query.trim()) return results.length > 0 ? [[t("common.results"), results] as [string, DecryptedItem[]]] : [];
    const groups = new Map<string, DecryptedItem[]>();
    for (const item of results) {
      const list = groups.get(item.vaultName) ?? [];
      list.push(item);
      groups.set(item.vaultName, list);
    }
    return [...groups.entries()];
  }, [results, query]);

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <List
      isLoading={refreshing}
      searchBarPlaceholder={t("search.placeholder")}
      onSearchTextChange={setQuery}
      filtering={false}
      isShowingDetail={showDetail}
      throttle
    >
      {!query.trim() && billing && usageLevel !== "ok" && billing.limits.maxItems !== null && (
        <List.Section title={t("search.planSection")}>
          <List.Item
            icon={{ source: Icon.Star, tintColor: usageLevel === "full" ? Color.Red : Color.Yellow }}
            title={t("search.freeUsage", { used: billing.usage.items, max: billing.limits.maxItems })}
            subtitle={shouldOfferUpgrade(billing) ? t("plan.upgrade") : undefined}
            detail={<List.Item.Detail markdown={`**${planLabel(billing)}**`} />}
            actions={
              <ActionPanel>
                {shouldOfferUpgrade(billing) && (
                  <Action title={upgradeCta(billing)} icon={Icon.Star} onAction={() => openCheckout(session)} />
                )}
                <Action.Push
                  title={t("common.planDetail")}
                  icon={Icon.Info}
                  target={<PlanDetail session={session} initial={billing} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {byVault.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={query ? t("search.noResults") : t("search.emptyVault")}
          description={query ? t("search.tryAnother") : t("search.createHint")}
        />
      )}
      {byVault.map(([vaultName, items]) => (
        <List.Section key={vaultName} title={vaultName} subtitle={`${items.length}`}>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              session={session}
              billing={billing}
              totpAllowed={totpAllowed}
              showDetail={showDetail}
              revealed={revealed.has(item.id)}
              onToggleDetail={() => setShowDetail((v) => !v)}
              onToggleReveal={() => toggleReveal(item.id)}
              onLock={onLock}
              onRefresh={refresh}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

interface RowProps {
  item: DecryptedItem;
  session: ActiveSession;
  billing: BillingStatus | null;
  /** false on the Free plan: no TOTP code is generated (the secret stays visible and copyable). */
  totpAllowed: boolean;
  showDetail: boolean;
  revealed: boolean;
  onToggleDetail: () => void;
  onToggleReveal: () => void;
  onLock: () => void;
  onRefresh: () => Promise<void>;
}

const TYPE_ICON: Record<DecryptedItem["data"]["type"], Icon> = {
  login: Icon.Key,
  note: Icon.Document,
  card: Icon.CreditCard,
  identity: Icon.Person,
};

function ItemRow({
  item,
  session,
  billing,
  totpAllowed,
  showDetail,
  revealed,
  onToggleDetail,
  onToggleReveal,
  onLock,
  onRefresh,
}: RowProps) {
  const { push } = useNavigation();
  const d = item.data;
  const host = d.urls[0] ? displayHost(d.urls[0]) : undefined;

  /** Secret actions never work past the auto-lock, even with the view still open. */
  async function ensureUnlocked(): Promise<boolean> {
    if (!session.isExpired()) return true;
    await session.lock();
    onLock();
    await showToast({ style: Toast.Style.Failure, title: t("common.locked") });
    return false;
  }

  async function copyPassword() {
    if (!(await ensureUnlocked())) return;
    if (!d.password) {
      await showToast({ style: Toast.Style.Failure, title: t("search.noPassword") });
      return;
    }
    await copySecret(d.password);
    await showHUD(t("search.passwordCopied"));
  }

  async function pastePassword() {
    if (!(await ensureUnlocked())) return;
    if (!d.password) return;
    await closeMainWindow();
    await Clipboard.paste(d.password);
  }

  async function copyUsername() {
    if (!(await ensureUnlocked())) return;
    if (!d.username) return;
    await Clipboard.copy(d.username);
    await showHUD(t("search.usernameCopied"));
  }

  async function copyTotp() {
    if (!(await ensureUnlocked())) return;
    if (!d.totp) return;
    if (!totpAllowed) {
      await showTotpLocked();
      return;
    }
    try {
      const { code, remaining } = await generateTotp(d.totp);
      await copySecret(code);
      await showHUD(t("search.totpCopied", { code, seconds: remaining }));
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: t("search.totpInvalid"), message: describeError(err) });
    }
  }

  /** The raw TOTP secret is available on every plan, so it can be used in another authenticator. */
  async function copyTotpSecret() {
    if (!(await ensureUnlocked())) return;
    if (!d.totp) return;
    await copySecret(d.totp);
    await showHUD(t("search.totpSecretCopied"));
  }

  async function showTotpLocked() {
    await showToast({
      style: Toast.Style.Failure,
      title: t("search.totpPremiumTitle"),
      message: t("search.totpPremiumMessage"),
      primaryAction:
        billing && shouldOfferUpgrade(billing)
          ? { title: upgradeCta(billing), onAction: () => void openCheckout(session) }
          : { title: t("common.planDetail"), onAction: () => push(<PlanDetail session={session} initial={billing} />) },
    });
  }

  async function pasteTotp() {
    if (!(await ensureUnlocked())) return;
    if (!d.totp) return;
    if (!totpAllowed) {
      await showTotpLocked();
      return;
    }
    try {
      const { code } = await generateTotp(d.totp);
      await closeMainWindow();
      await Clipboard.paste(code);
    } catch (err) {
      await showToast({ style: Toast.Style.Failure, title: t("search.totpInvalid"), message: describeError(err) });
    }
  }

  async function lock() {
    await session.lock(); // like the Lock Passig command: also clears the clipboard
    onLock();
    await showToast({ style: Toast.Style.Success, title: t("common.locked") });
  }

  return (
    <List.Item
      icon={{ source: TYPE_ICON[d.type], tintColor: d.favorite ? Color.Yellow : Color.PrimaryText }}
      title={d.title || t("common.untitled")}
      subtitle={showDetail ? undefined : d.username}
      keywords={[d.username, ...d.urls.map(displayHost)].filter(Boolean)}
      accessories={
        showDetail
          ? undefined
          : [
              ...(d.totp
                ? [
                    {
                      icon: Icon.Clock,
                      tooltip: totpAllowed ? t("search.totpAvailable") : t("search.totpPremiumTooltip"),
                    },
                  ]
                : []),
              ...(host ? [{ text: host, tooltip: d.urls.join("\n") }] : []),
            ]
      }
      detail={<ItemDetail item={item} revealed={revealed} totpAllowed={totpAllowed} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={d.title}>
            <Action title={t("action.copyPassword")} icon={Icon.Clipboard} onAction={copyPassword} />
            <Action
              title={t("action.pastePassword")}
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onAction={pastePassword}
            />
            <Action
              title={t("action.copyUsername")}
              icon={Icon.Person}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={copyUsername}
            />
            {d.totp && (
              <Action
                title={totpAllowed ? t("action.copyTotp") : t("action.totpPremium")}
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={copyTotp}
              />
            )}
            {d.totp && totpAllowed && (
              <Action
                title={t("action.pasteTotp")}
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={pasteTotp}
              />
            )}
            {d.totp && (
              <Action
                title={t("action.copyTotpSecret")}
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
                onAction={copyTotpSecret}
              />
            )}
            {d.urls[0] && (
              <Action.OpenInBrowser
                title={t("action.openWebsite")}
                url={/^[a-z]+:\/\//i.test(d.urls[0]) ? d.urls[0] : `https://${d.urls[0]}`}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={showDetail ? t("action.hideDetails") : t("action.showDetails")}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={onToggleDetail}
            />
            <Action
              title={revealed ? t("action.hidePassword") : t("action.showPassword")}
              icon={revealed ? Icon.EyeDisabled : Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={async () => {
                if (await ensureUnlocked()) onToggleReveal();
              }}
            />
            <Action
              title={t("action.refreshFromServer")}
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
            <Action.Push
              title={t("common.planDetail")}
              icon={Icon.Star}
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
              target={<PlanDetail session={session} initial={billing} />}
            />
            <BillingActions session={session} billing={billing} />
            <Action
              title={t("common.lock")}
              icon={Icon.Lock}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={lock}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ItemDetail({ item, revealed, totpAllowed }: { item: DecryptedItem; revealed: boolean; totpAllowed: boolean }) {
  const d = item.data;
  const [totp, setTotp] = useState<{ code: string; remaining: number } | null>(null);

  // Refresh the TOTP code every second while the detail is visible.
  useEffect(() => {
    if (!d.totp || !totpAllowed) return;
    let active = true;
    const update = () =>
      generateTotp(d.totp!)
        .then((t) => active && setTotp({ code: t.code, remaining: t.remaining }))
        .catch(() => active && setTotp(null));
    update();
    const timer = setInterval(update, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [d.totp, totpAllowed]);

  const masked = d.password ? "•".repeat(Math.min(d.password.length, 16)) : "—";
  return (
    <List.Item.Detail
      markdown={d.notes ? `### ${t("detail.notes")}\n\n${d.notes}` : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={t("common.title")} text={d.title} />
          <List.Item.Detail.Metadata.Label title={t("common.vault")} text={item.vaultName} />
          <List.Item.Detail.Metadata.Label title={t("common.username")} text={d.username || "—"} />
          <List.Item.Detail.Metadata.Label
            title={t("common.password")}
            text={revealed ? d.password || "—" : masked}
            icon={revealed ? Icon.Eye : Icon.EyeDisabled}
          />
          {d.totp && !totpAllowed && (
            <List.Item.Detail.Metadata.Label
              title={t("detail.totpSecret")}
              text={revealed ? d.totp : "••••••"}
              icon={revealed ? Icon.Eye : Icon.EyeDisabled}
            />
          )}
          {d.totp && (
            <List.Item.Detail.Metadata.Label
              title="TOTP"
              text={
                !totpAllowed
                  ? t("search.totpPremiumTitle")
                  : totp
                    ? t("detail.totpCode", { code: totp.code, seconds: totp.remaining })
                    : t("detail.totpInvalid")
              }
              icon={Icon.Clock}
            />
          )}
          {d.urls.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {d.urls.map((u, i) => (
            <List.Item.Detail.Metadata.Link
              key={i}
              title={i === 0 ? t("common.url") : ""}
              text={displayHost(u)}
              target={/^[a-z]+:\/\//i.test(u) ? u : `https://${u}`}
            />
          ))}
          {d.fields.length > 0 && <List.Item.Detail.Metadata.Separator />}
          {d.fields.map((f, i) => (
            <List.Item.Detail.Metadata.Label key={i} title={f.name} text={f.hidden && !revealed ? "••••••" : f.value} />
          ))}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={t("detail.updated")} text={formatDateTime(item.updatedAt)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
