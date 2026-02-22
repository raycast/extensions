import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
  Color,
} from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import { nanoid } from "nanoid";
import {
  getMastodonAccounts,
  addMastodonAccount,
  removeMastodonAccount,
  type MastodonAccount,
} from "./lib/accounts";
import { createClient, verifyCredentials } from "./lib/mastodon";

export default function ManageAccounts() {
  const {
    data: accounts,
    isLoading,
    revalidate,
  } = usePromise(getMastodonAccounts);

  return (
    <List isLoading={isLoading}>
      {(!accounts || accounts.length === 0) && (
        <List.EmptyView
          title="No Mastodon Accounts"
          description="Add a Mastodon account to enable cross-posting"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Mastodon Account"
                icon={Icon.Plus}
                target={<AddMastodonForm onDone={revalidate} />}
              />
            </ActionPanel>
          }
        />
      )}
      {accounts?.map((account) => (
        <List.Item
          key={account.id}
          icon={{ source: Icon.PersonCircle, tintColor: Color.Purple }}
          title={
            account.handle
              ? `@${account.handle}@${account.instance}`
              : account.instance
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Mastodon Account"
                icon={Icon.Plus}
                target={<AddMastodonForm onDone={revalidate} />}
              />
              <Action
                title="Remove Account"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Remove Account?",
                      message: `Remove ${account.handle ? `@${account.handle}@${account.instance}` : account.instance}?`,
                      primaryAction: {
                        title: "Remove",
                        style: Alert.ActionStyle.Destructive,
                      },
                    })
                  ) {
                    await removeMastodonAccount(account.id);
                    revalidate();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AddMastodonForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{
    profileUrl: string;
    token: string;
  }>({
    async onSubmit(values) {
      // Accept profile URL (https://mastodon.social/@user) or just instance (mastodon.social)
      const input = values.profileUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");
      const parts = input.split("/");
      const instance = parts[0];
      const handle = parts[1]?.startsWith("@") ? parts[1].slice(1) : undefined;

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Validating credentials...",
      });

      const account: MastodonAccount = {
        id: nanoid(),
        instance,
        handle,
        token: values.token,
      };

      try {
        const client = createClient(account);
        await verifyCredentials(client);
        await addMastodonAccount(account);
        toast.style = Toast.Style.Success;
        toast.title = "Mastodon account added";
        toast.message = instance;
        onDone();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Invalid credentials";
        toast.message = String(error);
      }
    },
    validation: {
      profileUrl: FormValidation.Required,
      token: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle="Add Mastodon Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Account" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Profile URL"
        placeholder="https://mastodon.social/@username"
        {...itemProps.profileUrl}
      />
      <Form.PasswordField
        title="Access Token"
        placeholder="Paste your access token"
        {...itemProps.token}
      />
      <Form.Description text="Generate an access token at your instance's Settings → Development → New Application" />
    </Form>
  );
}
