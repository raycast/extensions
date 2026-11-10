import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";

import {
  type Account,
  ACCOUNT_COLORS,
  accountColor,
  DEFAULT_SERVER,
  host,
  listAccounts,
  moveAccount,
  normalizeServer,
  removeAccount,
  updateAccount,
} from "../lib/accounts";
import { isSignedIn } from "../lib/auth";
import { connect, type Gathered } from "../lib/hackban";
import { RefreshAction, withToast } from "./actions";

/** A tag naming the item's account, when more than one account is showing. */
export function accountAccessory(account: Account, accounts: Account[]): List.Item.Accessory[] {
  return accounts.length > 1
    ? [{ tag: { value: account.label, color: accountColor(account) }, tooltip: host(account) }]
    : [];
}

async function signInAgain(account: Account) {
  return withToast(
    {
      loading: `Signing in to ${account.label}`,
      success: `Signed in to ${account.label}`,
      failure: "Couldn't sign in",
    },
    () => connect(account.server),
  );
}

export function ManageAccountsAction({ onChange }: { onChange?: () => void }) {
  return (
    <Action.Push
      title="Manage Accounts"
      icon={Icon.PersonCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      target={<AccountsView />}
      onPop={onChange}
    />
  );
}

/** For an empty list, which has no items to carry these: e.g. no cards yet, or every account hidden. */
export function EmptyViewActions({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <ActionPanel>
      {onRefresh && <RefreshAction onRefresh={onRefresh} />}
      <ManageAccountsAction onChange={onRefresh} />
    </ActionPanel>
  );
}

/** A section for accounts that need signing in again or couldn't be reached; nothing when all is well. */
export function AccountIssues({ data, onFixed }: { data: Gathered<unknown> | undefined; onFixed: () => void }) {
  if (!data?.signedOut.length && !data?.errors.length) return null;
  return (
    <List.Section title="Accounts">
      {data.signedOut.map((a) => (
        <List.Item
          key={a.id}
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          title={`Sign in to ${a.label} again`}
          subtitle={host(a)}
          actions={
            <ActionPanel>
              <Action
                title="Sign in Again"
                icon={Icon.Key}
                onAction={async () => {
                  if (await signInAgain(a)) onFixed();
                }}
              />
              <ManageAccountsAction onChange={onFixed} />
            </ActionPanel>
          }
        />
      ))}
      {data.errors.map(({ account: a, message }) => (
        <List.Item
          key={a.id}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={`Couldn't load ${a.label}`}
          subtitle={message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onFixed} />
              <ManageAccountsAction onChange={onFixed} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

function AddAccountForm({ onAdded }: { onAdded: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ server: string; label: string }>({
    initialValues: { server: DEFAULT_SERVER },
    validation: {
      server: (v) => {
        if (!v?.trim()) return "Enter the server's address";
        try {
          normalizeServer(v);
        } catch (e) {
          return (e as Error).message;
        }
      },
    },
    async onSubmit({ server, label }) {
      const url = normalizeServer(server);
      const ok = await withToast(
        { loading: `Signing in to ${new URL(url).host}`, success: "Account added", failure: "Couldn't sign in" },
        () => connect(url, label.trim() || undefined),
      );
      if (!ok) return;
      onAdded();
      pop();
    },
  });

  return (
    <Form
      navigationTitle="Add Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sign in" icon={Icon.Key} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Sign in to another Hackban server. Signing in to one you already have signs that account in again." />
      <Form.TextField title="Server" placeholder="hackban.hackclub.com" {...itemProps.server} />
      <Form.TextField title="Label" placeholder="Defaults to the server's address" {...itemProps.label} />
    </Form>
  );
}

function EditAccountForm({ account, onSaved }: { account: Account; onSaved: () => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ label: string; color: string; hidden: boolean }>({
    initialValues: {
      label: account.label,
      color: String(account.color % ACCOUNT_COLORS.length),
      hidden: !!account.hidden,
    },
    validation: { label: FormValidation.Required },
    async onSubmit({ label, color, hidden }) {
      await updateAccount(account.id, { label: label.trim(), color: Number(color), hidden });
      onSaved();
      pop();
    },
  });

  return (
    <Form
      navigationTitle={`Edit ${account.label}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Account" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Server" text={account.server} />
      <Form.TextField title="Label" {...itemProps.label} />
      <Form.Dropdown title="Color" {...itemProps.color}>
        {ACCOUNT_COLORS.map((c, i) => (
          <Form.Dropdown.Item
            key={c.name}
            title={c.name}
            value={String(i)}
            icon={{ source: Icon.CircleFilled, tintColor: c.color }}
          />
        ))}
      </Form.Dropdown>
      <Form.Checkbox label="Hide from My Cards, Search, Boards, Notifications and Create Card" {...itemProps.hidden} />
    </Form>
  );
}

async function loadAccounts() {
  const accounts = await listAccounts();
  return Promise.all(accounts.map(async (account) => ({ account, signedIn: await isSignedIn(account) })));
}

export function AccountsView() {
  const { data = [], isLoading, revalidate } = usePromise(loadAccounts);
  const add = (
    <Action.Push
      title="Add Account"
      icon={Icon.AddPerson}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddAccountForm onAdded={revalidate} />}
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Hackban Accounts"
      searchBarPlaceholder="Filter accounts"
      actions={<ActionPanel>{add}</ActionPanel>}
    >
      <List.EmptyView
        icon={Icon.PersonCircle}
        title="No accounts"
        description="Add your Hackban account to get started."
        actions={<ActionPanel>{add}</ActionPanel>}
      />
      {data.map(({ account: a, signedIn }, i) => (
        <List.Item
          key={a.id}
          icon={{ source: Icon.PersonCircle, tintColor: accountColor(a) }}
          title={a.label}
          subtitle={a.userName ? `Signed in as ${a.userName}` : undefined}
          accessories={[
            ...(signedIn ? [] : [{ tag: { value: "Signed out", color: Color.Red } }]),
            ...(a.hidden ? [{ tag: "Hidden", tooltip: "Left out of the other commands" }] : []),
            { text: host(a) },
          ]}
          actions={
            <ActionPanel title={a.label}>
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Account"
                  icon={Icon.Pencil}
                  target={<EditAccountForm account={a} onSaved={revalidate} />}
                />
                {!signedIn && (
                  <Action
                    title="Sign in Again"
                    icon={Icon.Key}
                    onAction={async () => {
                      if (await signInAgain(a)) revalidate();
                    }}
                  />
                )}
                <Action
                  title={a.hidden ? "Show in Other Commands" : "Hide from Other Commands"}
                  icon={a.hidden ? Icon.Eye : Icon.EyeDisabled}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                  onAction={async () => {
                    await updateAccount(a.id, { hidden: !a.hidden });
                    revalidate();
                  }}
                />
                <Action.OpenInBrowser url={a.server} />
                {add}
              </ActionPanel.Section>
              <ActionPanel.Section>
                {i > 0 && (
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                    onAction={async () => {
                      await moveAccount(a.id, -1);
                      revalidate();
                    }}
                  />
                )}
                {i < data.length - 1 && (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    onAction={async () => {
                      await moveAccount(a.id, 1);
                      revalidate();
                    }}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Sign out"
                  icon={Icon.Logout}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    const ok = await confirmAlert({
                      title: `Sign out of ${a.label}?`,
                      message:
                        "Raycast forgets this account. To cut off its access on the server too, revoke Raycast under Settings → Connected apps on Hackban.",
                      primaryAction: { title: "Sign Out", style: Alert.ActionStyle.Destructive },
                    });
                    if (!ok) return;
                    await removeAccount(a.id);
                    revalidate();
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
