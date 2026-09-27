import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, Keyboard } from "@raycast/api";
import { APP_URL, ENVIRONMENT } from "../lib/config";
import { PERIODS } from "../lib/finance";
import { accountName } from "../lib/format";
import type { FinancialAccount, Period } from "../lib/types";
import { useSession } from "./session";

export function ToggleDetailsAction({ showDetails, onToggle }: { showDetails: boolean; onToggle: () => void }) {
  return (
    <Action
      title={showDetails ? "Hide Details" : "Show Details"}
      icon={Icon.Sidebar}
      shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
      onAction={onToggle}
    />
  );
}

export function CommonActions({ refresh }: { refresh?: () => void }) {
  const { reconnect, signOut } = useSession();
  return (
    <>
      <ActionPanel.Section>
        {refresh && (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
        )}
        <Action.OpenInBrowser title="Open Synci" url={APP_URL} shortcut={Keyboard.Shortcut.Common.OpenWith} />
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </ActionPanel.Section>
      <ActionPanel.Section title={ENVIRONMENT === "staging" ? "Synci · Staging" : "Synci"}>
        <Action title="Reconnect Synci" icon={Icon.Person} onAction={reconnect} />
        <Action title="Sign out of Synci" icon={Icon.Logout} onAction={signOut} />
      </ActionPanel.Section>
    </>
  );
}

export function AccountDropdown({
  accounts,
  value,
  onChange,
}: {
  accounts?: FinancialAccount[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <List.Dropdown tooltip="Filter by Account" value={value} onChange={onChange}>
      <List.Dropdown.Item title="All Accounts" value="all" icon={Icon.Wallet} />
      <List.Dropdown.Section title="Accounts">
        {accounts?.map((account) => (
          <List.Dropdown.Item
            key={account.id}
            value={String(account.id)}
            title={`${accountName(account)}${account.currency ? ` · ${account.currency}` : ""}`}
            icon={Icon.BankNote}
          />
        ))}
      </List.Dropdown.Section>
      {value !== "all" && !accounts?.some((account) => String(account.id) === value) && (
        <List.Dropdown.Item title={`Account ${value}`} value={value} />
      )}
    </List.Dropdown>
  );
}

export function PeriodActions({
  period,
  onChange,
  allowAll = true,
}: {
  period: Period;
  onChange: (period: Period) => void;
  allowAll?: boolean;
}) {
  return (
    <ActionPanel.Submenu
      title="Change Period"
      icon={Icon.Calendar}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "p" },
        Windows: { modifiers: ["ctrl", "shift"], key: "p" },
      }}
    >
      {PERIODS.filter((item) => allowAll || item.value !== "all").map((item) => (
        <Action
          key={item.value}
          title={item.title}
          icon={period === item.value ? Icon.Checkmark : Icon.Calendar}
          onAction={() => onChange(item.value)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export const healthColor = (severity: number) =>
  severity >= 3 ? Color.Red : severity >= 1 ? Color.Orange : Color.Green;

export function EmptyState({
  title,
  description,
  refresh,
}: {
  title: string;
  description: string;
  refresh?: () => void;
}) {
  return (
    <List.EmptyView
      icon="synci-mark.png"
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Synci" url={APP_URL} />
          <CommonActions refresh={refresh} />
        </ActionPanel>
      }
    />
  );
}
