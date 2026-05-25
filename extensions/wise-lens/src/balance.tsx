import {
  Clipboard,
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isAuthError, isScaError } from "./lib/errors";
import { formatMoney, relativeTime } from "./lib/format";
import { getPrefs, prefsFingerprint } from "./lib/preferences";
import { inferPrimaryCurrency } from "./lib/summarize";
import { DashboardSnapshot } from "./lib/types";
import { fetchDashboardSnapshot, loadCachedSnapshot } from "./lib/wise-api";

async function copyAndHud(text: string) {
  await Clipboard.copy(text);
  await showHUD(`Copied ${text}`);
}

export default function Balance() {
  const prefs = getPrefs();
  const fingerprint = prefsFingerprint(prefs);

  const { data, isLoading, revalidate, error } = useCachedPromise(
    async (fp: string): Promise<DashboardSnapshot> => {
      void fp;
      try {
        return await fetchDashboardSnapshot(prefs);
      } catch (e) {
        const cached = loadCachedSnapshot();
        if (cached) return cached;
        throw e;
      }
    },
    [fingerprint],
    { keepPreviousData: true },
  );

  if (!prefs.apiToken && !prefs.useSampleData) {
    return (
      <MenuBarExtra icon={Icon.Warning} title="Wise Lens: set up token">
        <MenuBarExtra.Item title="Open Preferences" onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }

  if (error) {
    const isSca = isScaError(error);
    const isAuth = isAuthError(error);
    return (
      <MenuBarExtra
        icon={Icon.Warning}
        title={isSca ? "Wise Lens: SCA" : isAuth ? "Wise Lens: token" : "Wise Lens: error"}
        isLoading={isLoading}
      >
        <MenuBarExtra.Item title={error.message} />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
        <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }

  const snapshot = data;
  const summaryCurrency = snapshot
    ? prefs.displayCurrency || inferPrimaryCurrency(snapshot.activities)
    : prefs.displayCurrency || "EUR";

  const title = (() => {
    if (prefs.hideMenuBarBalance) return undefined;
    if (!snapshot) return "Wise Lens";
    if (snapshot.total) {
      const stalePrefix = snapshot.stale ? "⚠ " : "";
      return `${stalePrefix}${formatMoney(snapshot.total.value, snapshot.total.currency, prefs.locale)}`;
    }
    const primary = [...snapshot.balances]
      .filter((b) => b.type !== "SAVINGS" && Math.abs(b.amount.value) > 0.005)
      .sort((a, b) => (b.displayEquiv ?? b.amount.value) - (a.displayEquiv ?? a.amount.value))[0];
    if (primary) {
      const stalePrefix = snapshot.stale ? "⚠ " : "";
      return `${stalePrefix}${formatMoney(primary.amount.value, primary.currency, prefs.locale)}`;
    }
    return "Wise Lens";
  })();

  const tooltip = snapshot ? `Updated ${relativeTime(snapshot.fetchedAt)}` : "Wise Lens";

  const standardBalances = snapshot
    ? snapshot.balances.filter(
        (b) => b.type !== "SAVINGS" && (!prefs.hideZeroBalances || Math.abs(b.amount.value) > 0.005),
      )
    : [];
  const savingsBalances = snapshot
    ? snapshot.balances.filter(
        (b) => b.type === "SAVINGS" && (!prefs.hideZeroBalances || Math.abs(b.amount.value) > 0.005),
      )
    : [];

  return (
    <MenuBarExtra icon={Icon.BankNote} title={title} tooltip={tooltip} isLoading={isLoading}>
      {snapshot && (
        <>
          {snapshot.total && (
            <MenuBarExtra.Section>
              <MenuBarExtra.Item
                icon={{ source: Icon.BankNote, tintColor: Color.Green }}
                title={`Total${snapshot.total.partial ? " (partial)" : ""}`}
                subtitle={formatMoney(snapshot.total.value, snapshot.total.currency, prefs.locale)}
                onAction={() => copyAndHud(formatMoney(snapshot.total!.value, snapshot.total!.currency, prefs.locale))}
              />
            </MenuBarExtra.Section>
          )}

          {standardBalances.length > 0 && (
            <MenuBarExtra.Section title="Balances">
              {standardBalances.map((b) => (
                <MenuBarExtra.Item
                  key={b.id}
                  icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
                  title={b.currency}
                  subtitle={formatMoney(b.amount.value, b.currency, prefs.locale)}
                  onAction={() => copyAndHud(formatMoney(b.amount.value, b.currency, prefs.locale))}
                />
              ))}
            </MenuBarExtra.Section>
          )}

          {savingsBalances.length > 0 && (
            <MenuBarExtra.Section title="Jars">
              {savingsBalances.map((b) => (
                <MenuBarExtra.Item
                  key={b.id}
                  icon={{ source: Icon.SaveDocument, tintColor: Color.Purple }}
                  title={b.name ?? b.currency}
                  subtitle={formatMoney(b.amount.value, b.currency, prefs.locale)}
                  onAction={() => copyAndHud(formatMoney(b.amount.value, b.currency, prefs.locale))}
                />
              ))}
            </MenuBarExtra.Section>
          )}

          <MenuBarExtra.Section title="Spending">
            <MenuBarExtra.Item
              icon={{ source: Icon.Calendar, tintColor: Color.Orange }}
              title="This month"
              subtitle={formatMoney(snapshot.summary.spentMonth, summaryCurrency, prefs.locale)}
              onAction={() => copyAndHud(formatMoney(snapshot.summary.spentMonth, summaryCurrency, prefs.locale))}
            />
            <MenuBarExtra.Item
              icon={{ source: Icon.Calendar, tintColor: Color.Magenta }}
              title="Last 30 days"
              subtitle={formatMoney(snapshot.summary.spent30, summaryCurrency, prefs.locale)}
              onAction={() => copyAndHud(formatMoney(snapshot.summary.spent30, summaryCurrency, prefs.locale))}
            />
          </MenuBarExtra.Section>

          {snapshot.fxRate && (
            <MenuBarExtra.Section title="Exchange Rate">
              <MenuBarExtra.Item
                icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
                title={`${snapshot.fxRate.source} → ${snapshot.fxRate.target}`}
                subtitle={`1 ${snapshot.fxRate.source} ≈ ${formatMoney(snapshot.fxRate.rate, snapshot.fxRate.target, prefs.locale)}`}
                onAction={() => copyAndHud(formatMoney(snapshot.fxRate!.rate, snapshot.fxRate!.target, prefs.locale))}
              />
            </MenuBarExtra.Section>
          )}
        </>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh Now" icon={Icon.ArrowClockwise} onAction={revalidate} />
        <MenuBarExtra.Item
          title="Open Dashboard"
          icon={Icon.AppWindow}
          onAction={() => launchCommand({ name: "dashboard", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Transactions"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "transactions", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Open Wise.com"
          icon={Icon.Globe}
          onAction={() => open("https://wise.com/all-transactions")}
        />
        <MenuBarExtra.Item
          title="Community and Feedback"
          icon={Icon.Bubble}
          onAction={() => open("https://discord.gg/t6bwpWHrF7")}
        />
        <MenuBarExtra.Item title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
