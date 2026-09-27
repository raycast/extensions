import { ReactNode, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { LoginBalances, useBalances } from "./balances";
import { AddAccountForm } from "./components/AddAccountForm";
import { CardList } from "./components/CardList";
import { NoAccountsView } from "./components/ErrorViews";
import { TransactionList } from "./components/TransactionList";
import { TreasuryTransactionList } from "./components/TreasuryTransactions";
import { TreasuryView } from "./components/TreasuryView";
import { WireDetails, wireDetailsText } from "./components/WireDetails";
import { accountLabel, capitalize, formatCurrency } from "./format";
import { loadLogins, MercuryLogin, removeLogin } from "./logins";
import { Account, CreditAccount, MercuryAuthError, TreasuryAccount } from "./mercury";

// Kept under the original command name (`view-transactions`) so existing hotkeys and aliases still work.
export default function ManageAccounts() {
  const {
    data: logins,
    isLoading: isLoadingLogins,
    revalidate: reloadLogins,
  } = usePromise(loadLogins, [], {
    onError: () => {},
  });
  const { balances, refresh } = useBalances(logins);
  const [statusFilter, setStatusFilter] = useState("active");

  // Only current logins count: a removed login's cancelled refresh never clears its loading flag.
  const isRefreshing = (logins ?? []).some(
    (login) => balances[login.id]?.isLoadingAccounts || balances[login.id]?.isLoadingTreasury,
  );
  const onLoginsChanged = () => reloadLogins();

  return (
    <List
      isLoading={isLoadingLogins || isRefreshing}
      searchBarPlaceholder="Search accounts…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Status" value={statusFilter} onChange={setStatusFilter}>
          <List.Dropdown.Item title="Active Accounts" value="active" />
          <List.Dropdown.Item title="All Accounts" value="all" />
        </List.Dropdown>
      }
    >
      {!isLoadingLogins && logins?.length === 0 && <NoAccountsView onAdded={onLoginsChanged} />}
      {logins?.map((login) => (
        <LoginSection
          key={login.id}
          login={login}
          balances={balances[login.id]}
          statusFilter={statusFilter}
          onLoginsChanged={onLoginsChanged}
          onRefresh={refresh}
        />
      ))}
    </List>
  );
}

function LoginSection({
  login,
  balances,
  statusFilter,
  onLoginsChanged,
  onRefresh,
}: {
  login: MercuryLogin;
  balances?: LoginBalances;
  statusFilter: string;
  onLoginsChanged: () => void;
  onRefresh: () => void;
}) {
  const snapshot = balances?.snapshot;
  const visible = <T extends { status: string }>(items: T[] = []) =>
    items.filter((item) => statusFilter === "all" || item.status === "active");
  const accounts = visible(snapshot?.accounts);
  const treasury = visible(snapshot?.treasury);
  const credit = visible(snapshot?.credit);
  const cash = [...accounts, ...treasury].reduce((sum, account) => sum + account.currentBalance, 0);
  const owed = credit.reduce((sum, account) => sum + Math.abs(account.currentBalance), 0);
  const subtitle = snapshot
    ? [capitalize(login.kind), formatCurrency(cash), owed > 0 ? `${formatCurrency(owed)} owed` : undefined]
        .filter(Boolean)
        .join(" · ")
    : capitalize(login.kind);

  const loginActions = <LoginActions login={login} onLoginsChanged={onLoginsChanged} />;
  const refreshAction = (
    <Action
      title="Refresh Balances"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );

  return (
    <List.Section title={login.name} subtitle={subtitle}>
      {balances?.error && (
        <List.Item
          icon={{ source: balances.error instanceof MercuryAuthError ? Icon.Key : Icon.Warning, tintColor: Color.Red }}
          title={
            balances.error instanceof MercuryAuthError
              ? `Mercury rejected the token for ${login.name}`
              : `Couldn't refresh ${login.name}`
          }
          subtitle={
            snapshot
              ? `${balances.error.message} · Showing balances from ${new Date(snapshot.updatedAt).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}`
              : balances.error.message
          }
          actions={
            <ActionPanel>
              {balances.error instanceof MercuryAuthError ? (
                <Action.Push
                  title="Update Token"
                  icon={Icon.Key}
                  target={<AddAccountForm replacing={login} onSaved={onLoginsChanged} />}
                />
              ) : (
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRefresh} />
              )}
              {loginActions}
            </ActionPanel>
          }
        />
      )}
      {accounts.map((account) => (
        <AccountItem
          key={account.id}
          account={account}
          login={login}
          loginActions={loginActions}
          refreshAction={refreshAction}
          onLoginsChanged={onLoginsChanged}
        />
      ))}
      {snapshot?.treasury === undefined && balances?.isLoadingTreasury && !balances.error && (
        <List.Item
          icon={Icon.LineChart}
          title="Treasury"
          subtitle="Fetching balance…"
          actions={<ActionPanel>{loginActions}</ActionPanel>}
        />
      )}
      {treasury.map((account) => (
        <TreasuryItem
          key={account.id}
          account={account}
          login={login}
          loginActions={loginActions}
          refreshAction={refreshAction}
        />
      ))}
      {credit.map((account) => (
        <CreditItem key={account.id} account={account} loginActions={loginActions} refreshAction={refreshAction} />
      ))}
    </List.Section>
  );
}

function LoginActions({ login, onLoginsChanged }: { login: MercuryLogin; onLoginsChanged: () => void }) {
  async function remove() {
    const confirmed = await confirmAlert({
      title: `Remove ${login.name}?`,
      message:
        "Its token and saved balances are deleted from Raycast. The token stays valid in Mercury until you revoke it there.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeLogin(login.id);
    await showToast({ style: Toast.Style.Success, title: `Removed ${login.name}` });
    onLoginsChanged();
  }

  return (
    <ActionPanel.Section title="Mercury Accounts">
      <Action.Push
        title="Add Account"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<AddAccountForm onSaved={onLoginsChanged} />}
      />
      <Action.Push
        title={`Update Token for ${login.name}`}
        icon={Icon.Key}
        target={<AddAccountForm replacing={login} onSaved={onLoginsChanged} />}
      />
      <Action
        title={`Remove ${login.name}`}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={remove}
      />
    </ActionPanel.Section>
  );
}

function statusAccessory(status: string): List.Item.Accessory[] {
  return status === "active" ? [] : [{ tag: { value: capitalize(status), color: Color.SecondaryText } }];
}

function AccountItem({
  account,
  login,
  loginActions,
  refreshAction,
  onLoginsChanged,
}: {
  account: Account;
  login: MercuryLogin;
  loginActions: ReactNode;
  refreshAction: ReactNode;
  onLoginsChanged: () => void;
}) {
  const kind = capitalize(account.kind);
  return (
    <List.Item
      icon={Icon.BankNote}
      title={accountLabel(account)}
      subtitle={formatCurrency(account.currentBalance)}
      keywords={[account.accountNumber.slice(-4), login.name, account.kind]}
      accessories={[
        ...statusAccessory(account.status),
        { tag: { value: kind, color: account.kind.toLowerCase() === "checking" ? Color.Blue : Color.Green } },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Transactions"
              icon={Icon.List}
              target={<TransactionList scope={{ kind: "account", login, account }} onLoginsChanged={onLoginsChanged} />}
            />
            <Action.Push
              title="View Wire Details"
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
              target={<WireDetails account={account} login={login} />}
            />
            <ViewStatementsAction accountId={account.id} />
            <Action.Push
              title="View Cards"
              icon={Icon.CreditCard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              target={<CardList logins={[login]} accountId={account.id} />}
            />
            {refreshAction}
            <Action.OpenInBrowser title="Open in Browser" url={account.dashboardLink} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Account Number"
              content={account.accountNumber}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy Routing Number"
              content={account.routingNumber}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
            <Action.CopyToClipboard
              title="Copy Wire Details"
              content={wireDetailsText(account, login)}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
          {loginActions}
        </ActionPanel>
      }
    />
  );
}

function TreasuryItem({
  account,
  login,
  loginActions,
  refreshAction,
}: {
  account: TreasuryAccount;
  login: MercuryLogin;
  loginActions: ReactNode;
  refreshAction: ReactNode;
}) {
  const lastReturn = [...account.netReturns].sort((a, b) => b.month.localeCompare(a.month))[0];
  const month = lastReturn
    ? new Date(`${lastReturn.month.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short" })
    : undefined;
  return (
    <List.Item
      icon={Icon.LineChart}
      title="Treasury"
      subtitle={[
        formatCurrency(account.currentBalance),
        lastReturn
          ? `${lastReturn.netAmount >= 0 ? "+" : "−"}${formatCurrency(Math.abs(lastReturn.netAmount))} in ${month}`
          : undefined,
      ]
        .filter(Boolean)
        .join(" · ")}
      accessories={[...statusAccessory(account.status), { tag: { value: "Treasury", color: Color.Purple } }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="View Treasury"
              icon={Icon.LineChart}
              target={<TreasuryView login={login} account={account} />}
            />
            <Action.Push
              title="View Activity"
              icon={Icon.List}
              target={<TreasuryTransactionList login={login} account={account} />}
            />
            <ViewStatementsAction accountId={`treasury:${login.id}`} />
            {refreshAction}
            <Action.CopyToClipboard
              title="Copy Balance"
              content={formatCurrency(account.currentBalance)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
          {loginActions}
        </ActionPanel>
      }
    />
  );
}

function CreditItem({
  account,
  loginActions,
  refreshAction,
}: {
  account: CreditAccount;
  loginActions: ReactNode;
  refreshAction: ReactNode;
}) {
  return (
    <List.Item
      icon={Icon.CreditCard}
      title="Mercury Credit"
      subtitle={`${formatCurrency(Math.abs(account.currentBalance))} owed · ${formatCurrency(account.availableBalance)} available`}
      accessories={[...statusAccessory(account.status), { tag: { value: "Credit", color: Color.Orange } }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Balance Owed"
              content={formatCurrency(Math.abs(account.currentBalance))}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {refreshAction}
          </ActionPanel.Section>
          {loginActions}
        </ActionPanel>
      }
    />
  );
}

/** Opens the View Statements command filtered to one account. */
function ViewStatementsAction({ accountId }: { accountId: string }) {
  return (
    <Action
      title="View Statements"
      icon={Icon.Receipt}
      shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
      onAction={() =>
        launchCommand({ name: "view-statements", type: LaunchType.UserInitiated, context: { accountId } })
      }
    />
  );
}
