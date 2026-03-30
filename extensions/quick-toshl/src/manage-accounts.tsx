import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  useNavigation,
  showToast,
  Toast,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "./utils/toshl";
import type { Account } from "./utils/types";
import { CURRENCY_SYMBOLS } from "./utils/helpers";

const ACCOUNT_TYPES = [
  { value: "custom", title: "Custom" },
  { value: "depository", title: "Depository" },
  { value: "credit_card", title: "Credit card" },
  { value: "savings", title: "Savings" },
  { value: "other", title: "Other" },
];

function AddAccountForm({ onSaved }: { onSaved: () => void }) {
  const { pop } = useNavigation();
  const { data: currencies } = useCachedPromise(() => toshl.getCurrencies());
  const { data: defaultCurrency } = useCachedPromise(() => toshl.getDefaultCurrency());

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            icon={Icon.Plus}
            onSubmit={async (v: { name: string; currency: string; type: string; initial_balance: string }) => {
              if (!v.name?.trim()) {
                showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              const bal = v.initial_balance ? parseFloat(v.initial_balance) : 0;
              await toshl.createAccount({
                name: v.name.trim(),
                currency: { code: v.currency || defaultCurrency || "USD" },
                type: v.type || "custom",
                initial_balance: isNaN(bal) ? 0 : bal,
              });
              showToast({ style: Toast.Style.Success, title: "Account created" });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g. Main checking" />
      <Form.Dropdown id="currency" title="Currency" defaultValue={defaultCurrency}>
        {(currencies || []).map((c) => {
          const sym = CURRENCY_SYMBOLS[c.code]?.symbol;
          return <Form.Dropdown.Item key={c.code} value={c.code} title={sym ? `${c.code} (${sym})` : c.code} />;
        })}
      </Form.Dropdown>
      <Form.Dropdown id="type" title="Type" defaultValue="custom">
        {ACCOUNT_TYPES.map((t) => (
          <Form.Dropdown.Item key={t.value} value={t.value} title={t.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="initial_balance" title="Initial balance" placeholder="0" />
    </Form>
  );
}

function EditAccountForm({ account, onSaved }: { account: Account; onSaved: () => void }) {
  const { pop } = useNavigation();
  const { data: currencies } = useCachedPromise(() => toshl.getCurrencies());

  if (!account.modified) {
    return (
      <Form navigationTitle="Edit Account">
        <Form.Description text="Enable “Force Refresh Cache” in preferences, run a command, then try again." />
      </Form>
    );
  }

  return (
    <Form
      navigationTitle="Edit Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (v: { name: string; currency: string }) => {
              if (!v.name?.trim()) {
                showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              await toshl.updateAccount({
                id: account.id,
                name: v.name.trim(),
                modified: account.modified!,
                currency: {
                  code: v.currency,
                  rate: account.currency.rate,
                  fixed: account.currency.fixed,
                },
              });
              showToast({ style: Toast.Style.Success, title: "Account updated" });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={account.name} />
      <Form.Dropdown id="currency" title="Currency" defaultValue={account.currency.code}>
        {(currencies || []).map((c) => {
          const sym = CURRENCY_SYMBOLS[c.code]?.symbol;
          return <Form.Dropdown.Item key={c.code} value={c.code} title={sym ? `${c.code} (${sym})` : c.code} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}

export default function ManageAccounts() {
  const { push } = useNavigation();
  const { data: accounts, isLoading, revalidate } = useCachedPromise(() => toshl.getAccounts());

  async function remove(a: Account) {
    if (
      await confirmAlert({
        title: "Delete account",
        message: `Delete “${a.name}”? This cannot be undone in Raycast if Toshl rejects it (e.g. linked data).`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await toshl.deleteAccount(a.id);
      showToast({ style: Toast.Style.Success, title: "Account deleted" });
      revalidate();
    }
  }

  return (
    <List
      navigationTitle="Accounts"
      isLoading={isLoading}
      searchBarPlaceholder="Filter accounts…"
      actions={
        <ActionPanel>
          <Action title="Add Account" icon={Icon.Plus} onAction={() => push(<AddAccountForm onSaved={revalidate} />)} />
        </ActionPanel>
      }
    >
      <List.Section title="Accounts">
        {accounts?.map((a) => (
          <List.Item
            key={a.id}
            title={a.name}
            subtitle={a.currency.code}
            icon={Icon.CreditCard}
            actions={
              <ActionPanel>
                <Action
                  title="Edit"
                  icon={Icon.Pencil}
                  onAction={() => push(<EditAccountForm account={a} onSaved={revalidate} />)}
                />
                <Action
                  title="Add Account"
                  icon={Icon.Plus}
                  onAction={() => push(<AddAccountForm onSaved={revalidate} />)}
                />
                <Action title="Delete" icon={Icon.Trash} style={Action.Style.Destructive} onAction={() => remove(a)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
