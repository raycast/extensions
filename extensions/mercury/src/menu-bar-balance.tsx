import { useState } from "react";
import {
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  openExtensionPreferences,
} from "@raycast/api";
import { fakerKey } from "@chrismessina/raycast-faker";
import { usePromise } from "@raycast/utils";
import { readSnapshot, refreshSnapshot, Snapshot } from "./balances";
import { accountLabel, formatCurrency } from "./format";
import { loadLogins, MercuryLogin } from "./logins";
import { log, MercuryAuthError, toError } from "./mercury";

const SHOW_BALANCE_KEY = "menu-bar-show-balance";
const EXCLUDED_KEY = "menu-bar-excluded-accounts";

const INTERVAL_MS: Record<string, number> = {
  "10m": 10 * 60_000,
  "1h": 60 * 60_000,
  "12h": 12 * 60 * 60_000,
  "24h": 24 * 60 * 60_000,
};

interface LoginState {
  login: MercuryLogin;
  snapshot?: Snapshot;
  error?: Error;
}

interface MenuState {
  logins: LoginState[];
  showBalance: boolean;
  excluded: string[];
}

/**
 * Raycast wakes this command every 10 minutes (the manifest's fixed interval). Mercury is only
 * asked again once the saved balances are older than the "Refresh Every" preference, or when the
 * user picks Refresh.
 */
async function load(force: boolean): Promise<MenuState> {
  const { refreshInterval } = getPreferenceValues<Preferences.MenuBarBalance>();
  const maxAge = INTERVAL_MS[refreshInterval] ?? INTERVAL_MS["10m"];
  const [logins, showBalance, excluded] = await Promise.all([
    loadLogins(),
    LocalStorage.getItem<boolean>(fakerKey(SHOW_BALANCE_KEY)),
    LocalStorage.getItem<string>(fakerKey(EXCLUDED_KEY)),
  ]);

  const states = await Promise.all(
    logins.map(async (login): Promise<LoginState> => {
      const cached = await readSnapshot(login.id);
      const age = cached ? Date.now() - new Date(cached.updatedAt).getTime() : Infinity;
      if (!force && age < maxAge && cached?.treasury !== undefined) return { login, snapshot: cached };
      try {
        return { login, snapshot: await refreshSnapshot(login) };
      } catch (error) {
        log.log("Menu bar refresh failed:", error instanceof Error ? error.message : String(error));
        return { login, snapshot: cached, error: toError(error) };
      }
    }),
  );

  return {
    logins: states,
    showBalance: showBalance ?? false,
    excluded: excluded ? (JSON.parse(excluded) as string[]) : [],
  };
}

function compact(amount: number) {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function time(iso: string) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return date.toLocaleString("en-US", sameDay ? { timeStyle: "short" } : { dateStyle: "medium", timeStyle: "short" });
}

export default function MenuBarBalance() {
  const [force, setForce] = useState(false);
  const { data: loaded, isLoading, revalidate } = usePromise(load, [force], { onError: () => {} });
  // Toggles apply instantly; they're saved to LocalStorage for the next launch.
  const [overrides, setOverrides] = useState<Partial<Pick<MenuState, "excluded" | "showBalance">>>({});
  const data = loaded && { ...loaded, ...overrides };

  const excluded = new Set(data?.excluded ?? []);
  // Credit is never part of the total: it's money owed, not money held.
  const included = (id: string) => !excluded.has(id);
  const loginTotal = (snapshot?: Snapshot) =>
    [...(snapshot?.accounts ?? []), ...(snapshot?.treasury ?? [])]
      .filter((account) => account.status === "active" && included(account.id))
      .reduce((sum, account) => sum + account.currentBalance, 0);
  const total = (data?.logins ?? []).reduce((sum, state) => sum + loginTotal(state.snapshot), 0);
  const updatedAt = (data?.logins ?? [])
    .map((state) => state.snapshot?.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  const failures = (data?.logins ?? []).filter((state) => state.error);
  const authFailures = failures.filter((state) => state.error instanceof MercuryAuthError);
  // Any failure that isn't a rejected token, or a Treasury that never answered, means some
  // balances couldn't refresh.
  const offline =
    failures.some((state) => !(state.error instanceof MercuryAuthError)) ||
    (data?.logins ?? []).some((state) => state.snapshot && state.snapshot.treasury === undefined);
  // A total missing an account would read as the whole balance, so show it only when complete.
  const complete =
    (data?.logins.length ?? 0) > 0 && (data?.logins ?? []).every((state) => state.snapshot?.treasury !== undefined);

  async function toggleAccount(id: string) {
    const next = excluded.has(id) ? [...excluded].filter((value) => value !== id) : [...excluded, id];
    await LocalStorage.setItem(fakerKey(EXCLUDED_KEY), JSON.stringify(next));
    setOverrides((current) => ({ ...current, excluded: next }));
  }

  async function toggleShowBalance() {
    const next = !data?.showBalance;
    await LocalStorage.setItem(fakerKey(SHOW_BALANCE_KEY), next);
    setOverrides((current) => ({ ...current, showBalance: next }));
  }

  const openManageAccounts = () => launchCommand({ name: "view-transactions", type: LaunchType.UserInitiated });
  const openTransactions = (filter: string) =>
    launchCommand({ name: "search-transactions", type: LaunchType.UserInitiated, context: { filter } });

  return (
    <MenuBarExtra
      icon={{
        source: "mercury-logo.svg",
        tintColor: authFailures.length > 0 ? Color.Orange : Color.PrimaryText,
      }}
      title={data?.showBalance && complete ? compact(total) : undefined}
      tooltip="Mercury balances"
      isLoading={isLoading}
    >
      {data?.logins.length === 0 && (
        <MenuBarExtra.Item title="Add a Mercury Account…" icon={Icon.Plus} onAction={openManageAccounts} />
      )}
      {authFailures.map(({ login, error }) => (
        <MenuBarExtra.Section key={`auth-${login.id}`}>
          <MenuBarExtra.Item
            title={`Mercury rejected the token for ${login.name}`}
            icon={{ source: Icon.Key, tintColor: Color.Red }}
          />
          <MenuBarExtra.Item title={error?.message ?? ""} />
          <MenuBarExtra.Item title="Update Token in Manage Accounts…" onAction={openManageAccounts} />
        </MenuBarExtra.Section>
      ))}
      {offline && (
        <MenuBarExtra.Item title="Couldn't reach Mercury" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {data?.logins.map(({ login, snapshot }) => {
        if (!snapshot) return null;
        const accounts = snapshot.accounts.filter((account) => account.status === "active");
        const treasury = (snapshot.treasury ?? []).filter((account) => account.status === "active");
        const credit = snapshot.credit.filter((account) => account.status === "active");
        const rows = [
          ...accounts.map((account) => ({
            id: account.id,
            title: accountLabel(account),
            balance: account.currentBalance,
            filter: `${login.id}:${account.id}`,
          })),
          ...treasury.map((account) => ({
            id: account.id,
            title: "Treasury",
            balance: account.currentBalance,
            filter: undefined,
          })),
        ];
        return (
          <MenuBarExtra.Section key={login.id} title={`${login.name} · ${formatCurrency(loginTotal(snapshot))}`}>
            {rows.map((row) => (
              <MenuBarExtra.Item
                key={row.id}
                title={row.title}
                subtitle={formatCurrency(row.balance)}
                onAction={() => (row.filter ? openTransactions(row.filter) : openManageAccounts())}
                alternate={
                  <MenuBarExtra.Item
                    title={row.title}
                    subtitle={formatCurrency(row.balance)}
                    icon={included(row.id) ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
                    tooltip={included(row.id) ? "Included in the menu bar total" : "Not included in the menu bar total"}
                    onAction={() => toggleAccount(row.id)}
                  />
                }
              />
            ))}
            {credit.map((account) => (
              <MenuBarExtra.Item
                key={account.id}
                title="Mercury Credit"
                subtitle={`${formatCurrency(Math.abs(account.currentBalance))} owed`}
                tooltip="Credit is never part of the total"
                onAction={openManageAccounts}
              />
            ))}
          </MenuBarExtra.Section>
        );
      })}
      <MenuBarExtra.Section>
        {data && data.logins.length > 0 && (
          <MenuBarExtra.Item title="Hold ⌥ to choose which accounts count toward the total" />
        )}
        <MenuBarExtra.Item
          title={data?.showBalance ? "Hide Balance in Menu Bar" : "Show Balance in Menu Bar"}
          onAction={toggleShowBalance}
        />
        <MenuBarExtra.Item
          title="Search Transactions…"
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => openTransactions("all")}
        />
        <MenuBarExtra.Item
          title="Refresh"
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => (force ? revalidate() : setForce(true))}
        />
        {updatedAt && <MenuBarExtra.Item title={`Updated ${time(updatedAt)}`} />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Preferences…" onAction={openExtensionPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
