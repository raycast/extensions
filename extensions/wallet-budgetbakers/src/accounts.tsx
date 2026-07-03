import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  WalletAccount,
  createAccount,
  getAccounts,
  patchAccounts,
} from "./lib/api";
import { formatMoney, parseMoneyDeep } from "./lib/format";

const ACCOUNT_TYPES = [
  { value: "General", title: "General" },
  { value: "Cash", title: "Cash" },
  { value: "CurrentAccount", title: "Current Account" },
  { value: "SavingAccount", title: "Savings Account" },
  { value: "Insurance", title: "Insurance" },
];

function accountBalance(account: WalletAccount) {
  return (
    parseMoneyDeep(account.balance, account.currencyCode ?? "") ??
    parseMoneyDeep(account.recordStats, account.currencyCode ?? "")
  );
}

export default function Accounts() {
  const {
    data: accounts,
    isLoading,
    revalidate,
  } = useCachedPromise(getAccounts);

  async function toggleArchived(account: WalletAccount) {
    try {
      await patchAccounts([{ id: account.id, archived: !account.archived }]);
      await showToast({
        style: Toast.Style.Success,
        title: account.archived ? "Account unarchived" : "Account archived",
      });
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "Could not update account" });
    }
  }

  const active = (accounts ?? []).filter((account) => !account.archived);
  const archived = (accounts ?? []).filter((account) => account.archived);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search accounts…">
      <List.Section title="Active Accounts">
        {active.map((account) => (
          <AccountItem
            key={account.id}
            account={account}
            revalidate={revalidate}
            onToggleArchived={toggleArchived}
          />
        ))}
      </List.Section>
      <List.Section title="Archived">
        {archived.map((account) => (
          <AccountItem
            key={account.id}
            account={account}
            revalidate={revalidate}
            onToggleArchived={toggleArchived}
          />
        ))}
      </List.Section>
    </List>
  );
}

function AccountItem({
  account,
  revalidate,
  onToggleArchived,
}: {
  account: WalletAccount;
  revalidate: () => void;
  onToggleArchived: (account: WalletAccount) => void;
}) {
  const balance = accountBalance(account);
  return (
    <List.Item
      icon={{
        source: account.isBankSync ? Icon.Building : Icon.Wallet,
        tintColor: account.color ?? Color.Blue,
      }}
      title={account.name ?? account.id}
      subtitle={account.accountType}
      accessories={[
        account.isBankSync ? { tag: { value: "Bank", color: Color.Blue } } : {},
        account.excludeFromStats
          ? {
              tag: { value: "Excluded from stats", color: Color.SecondaryText },
            }
          : {},
        {
          text: balance
            ? {
                value: formatMoney(balance),
                color: balance.value < 0 ? Color.Red : Color.PrimaryText,
              }
            : "—",
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Rename Account"
            icon={Icon.Pencil}
            target={<RenameForm account={account} onDone={revalidate} />}
          />
          <Action.Push
            title="Create Account"
            icon={Icon.Plus}
            target={<CreateAccountForm onDone={revalidate} />}
            shortcut={Keyboard.Shortcut.Common.New}
          />
          <Action
            title={account.archived ? "Unarchive Account" : "Archive Account"}
            icon={account.archived ? Icon.Undo : Icon.Tray}
            onAction={() => onToggleArchived(account)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        </ActionPanel>
      }
    />
  );
}

function RenameForm({
  account,
  onDone,
}: {
  account: WalletAccount;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  async function handleSubmit(values: { name: string }) {
    if (!values.name.trim()) return;
    try {
      await patchAccounts([{ id: account.id, name: values.name.trim() }]);
      await showToast({ style: Toast.Style.Success, title: "Account renamed" });
      onDone();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Could not rename account" });
    }
  }
  return (
    <Form
      navigationTitle="Rename Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={account.name ?? ""}
      />
    </Form>
  );
}

function CreateAccountForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();
  async function handleSubmit(values: {
    name: string;
    accountType: string;
    currencyCode: string;
    initialBalance: string;
  }) {
    const balance = Number(values.initialBalance.replace(",", ".") || "0");
    if (!values.name.trim() || !Number.isFinite(balance)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check the name and initial balance",
      });
      return;
    }
    try {
      await createAccount({
        name: values.name.trim(),
        accountType: values.accountType,
        currencyCode: values.currencyCode.trim().toUpperCase(),
        initialBalance: balance,
      });
      await showToast({ style: Toast.Style.Success, title: "Account created" });
      onDone();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Could not create account" });
    }
  }
  return (
    <Form
      navigationTitle="Create Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Account"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My account" />
      <Form.Dropdown id="accountType" title="Type">
        {ACCOUNT_TYPES.map((type) => (
          <Form.Dropdown.Item
            key={type.value}
            value={type.value}
            title={type.title}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="currencyCode"
        title="Currency (ISO 4217)"
        placeholder="USD"
        defaultValue="EUR"
      />
      <Form.TextField
        id="initialBalance"
        title="Initial Balance"
        placeholder="0.00"
        defaultValue="0"
      />
    </Form>
  );
}
