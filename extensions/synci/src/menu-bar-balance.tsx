import { Color, Icon, launchCommand, LaunchType, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { api } from "./lib/api";
import { accountBalance, accountName, dateLabel, money } from "./lib/format";
import { menuBarSummary } from "./lib/menu-bar";
import { SignInRequiredError } from "./lib/oauth-session";
import { copyDiagnostics } from "./components/diagnostics";

export default function MenuBarBalance() {
  // Never start an interactive OAuth flow from a background menu-bar refresh.
  const abortable = useRef<AbortController | null>(null);
  // Keep recurring refreshes lightweight; missing summaries stay unavailable.
  const { data, error, isLoading, revalidate } = usePromise(() => api.accounts(abortable.current?.signal), [], {
    abortable,
    onError: () => {},
  });
  const [selectedIds, setSelectedIds] = useCachedState<string[]>("menu-bar-accounts", [], {
    cacheNamespace: "synci-views",
  });
  const [currency, setCurrency] = useCachedState("menu-bar-currency", "", { cacheNamespace: "synci-views" });
  const summary = menuBarSummary(error ? [] : (data ?? []), selectedIds, currency);
  const openAccounts = (accountId?: string) =>
    launchCommand({
      name: "check-balances",
      type: LaunchType.UserInitiated,
      context: accountId ? { accountId } : undefined,
    });
  const toggle = async (id: string) => {
    await setSelectedIds((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));
  };
  return (
    <MenuBarExtra
      icon={
        error || summary.unavailable ? Icon.ExclamationMark : { source: "synci-mark.png", tintColor: Color.PrimaryText }
      }
      title={
        !error && !summary.unavailable && summary.displayed
          ? money(summary.displayed[1].amount.toString(), summary.displayed[0])
          : undefined
      }
      tooltip={
        error
          ? "Synci could not refresh balances"
          : `${summary.selected.length} selected accounts · Balances at last provider sync`
      }
      isLoading={isLoading}
    >
      {error ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={error instanceof SignInRequiredError ? "Sign In to Synci" : "Couldn't Refresh Balances"}
            onAction={() => openAccounts()}
          />
          <MenuBarExtra.Item title="Copy Error Details" onAction={() => copyDiagnostics(error)} />
        </MenuBarExtra.Section>
      ) : (
        <>
          <MenuBarExtra.Section
            title={summary.unavailable ? "Known Balances · Some Unavailable" : "Selected Account Totals"}
          >
            {summary.totals.map(([code, total]) => (
              <MenuBarExtra.Item
                key={code}
                title={`${code} · ${money(total.amount.toString(), code)}`}
                subtitle={`${total.count} ${total.count === 1 ? "account" : "accounts"} · ${[...total.kinds].join(", ")}`}
                onAction={() => openAccounts()}
              />
            ))}
            {!summary.selected.length && <MenuBarExtra.Item title="Choose accounts below to show a balance" />}
            {summary.unavailable > 0 && (
              <MenuBarExtra.Item title={`${summary.unavailable} selected balances unavailable`} />
            )}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Accounts">
            {summary.selected.map((account) => (
              <MenuBarExtra.Item
                key={account.id}
                title={accountName(account)}
                subtitle={`Synced ${dateLabel(account.balances_last_synced_at, true)}`}
                onAction={() => openAccounts(String(account.id))}
              />
            ))}
          </MenuBarExtra.Section>
          <MenuBarExtra.Submenu title="Accounts in Total" icon={Icon.Wallet}>
            {(data ?? [])
              .filter((account) => account.enabled)
              .map((account) => (
                <MenuBarExtra.Item
                  key={account.id}
                  title={`${accountName(account)} · ${account.financial_connection?.institution?.name || "Synci"}`}
                  subtitle={money(accountBalance(account).amount, accountBalance(account).currency)}
                  icon={selectedIds.includes(String(account.id)) ? Icon.Checkmark : Icon.Circle}
                  onAction={() => toggle(String(account.id))}
                />
              ))}
            <MenuBarExtra.Item title="Clear Selection" onAction={() => setSelectedIds([])} />
          </MenuBarExtra.Submenu>
          <MenuBarExtra.Submenu title="Menu Bar Display" icon={Icon.Coins}>
            <MenuBarExtra.Item
              title="Icon Only"
              icon={!currency ? Icon.Checkmark : Icon.Circle}
              onAction={() => setCurrency("")}
            />
            {summary.totals.map(([code]) => (
              <MenuBarExtra.Item
                key={code}
                title={code}
                icon={currency === code ? Icon.Checkmark : Icon.Circle}
                onAction={() => setCurrency(code)}
              />
            ))}
          </MenuBarExtra.Submenu>
        </>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="View Accounts" icon={Icon.Wallet} onAction={() => openAccounts()} />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
        <MenuBarExtra.Item title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
