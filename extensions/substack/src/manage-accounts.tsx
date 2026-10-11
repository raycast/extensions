import { randomUUID } from "node:crypto";
import { useEffect, useRef, useState } from "react";

import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

import {
  type AccountConnection,
  defaultAccountId,
  removeAccount,
  resolveAccount,
  saveAccount,
  setDefaultAccount,
} from "@/lib/accounts";

import useAccounts from "@/hooks/useAccounts";

type Values = { label: string; publication: string; sessionCookie: string; connectCookie: string };
function AccountForm({ accountId, onSaved }: { accountId?: string; onSaved: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [account, setAccount] = useState<AccountConnection>();
  const [loading, setLoading] = useState(!!accountId);
  const submitting = useRef(false);
  const { handleSubmit, itemProps, setValue } = useForm<Values>({
    initialValues: { label: "", publication: "", sessionCookie: "", connectCookie: "" },
    validation: {
      publication: (v) => (!v?.trim() ? "Enter a publication." : undefined),
      sessionCookie: (v) => (!v?.trim() ? "Enter a session cookie." : undefined),
    },
    async onSubmit(values) {
      if (submitting.current || loading) return;
      submitting.current = true;
      setLoading(true);
      try {
        await saveAccount({ id: account?.id ?? randomUUID(), ...values });
        await onSaved();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not save account",
          message: error instanceof Error ? error.message : "Try again.",
        });
      } finally {
        submitting.current = false;
        setLoading(false);
      }
    },
  });
  useEffect(() => {
    if (!accountId) return;
    let active = true;
    void resolveAccount(accountId)
      .then((a) => {
        if (active) {
          setAccount(a);
          setValue("label", a.label);
          setValue("publication", a.publication);
          setValue("sessionCookie", a.sessionCookie);
          setValue("connectCookie", a.connectCookie ?? "");
          setLoading(false);
        }
      })
      .catch(async () => {
        if (active) {
          await showToast({ style: Toast.Style.Failure, title: "Could not load account" });
          pop();
        }
      });
    return () => {
      active = false;
    };
  }, [accountId]);
  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Account" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Publication" placeholder="raycastweekly" {...itemProps.publication} />
      <Form.PasswordField title="Substack Session Cookie" {...itemProps.sessionCookie} />
      <Form.PasswordField title="Connect Session Cookie (Optional)" {...itemProps.connectCookie} />
      <Form.TextField title="Account Label (Optional)" placeholder="Defaults to Publication" {...itemProps.label} />
      <Form.Description text="Use the canonical Substack publication name. Paste cookie values only. Leave the connect session cookie blank unless your account requires it. Saved connections and recovery links use Raycast's encrypted local storage." />
    </Form>
  );
}
export default function ManageAccounts() {
  const { accounts, isLoading, error, reload } = useAccounts();
  const [defaultId, setDefaultId] = useState<string>();
  const refresh = async () => {
    await reload();
    setDefaultId(await defaultAccountId());
  };
  useEffect(() => {
    void defaultAccountId()
      .then(setDefaultId)
      .catch(() => {});
  }, []);
  const add = (
    <Action.Push
      shortcut={Keyboard.Shortcut.Common.New}
      title="Add Account"
      target={<AccountForm onSaved={refresh} />}
    />
  );
  async function change(action: () => Promise<void>) {
    try {
      await action();
      await refresh();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not update accounts",
        message: error instanceof Error ? error.message : "Try again.",
      });
    }
  }
  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {add}
          <Action
            shortcut={Keyboard.Shortcut.Common.Refresh}
            title="Refresh Accounts"
            onAction={() => change(async () => {})}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView title={error ?? "Add a Substack account"} />
      {accounts.map((a) => (
        <List.Item
          key={a.id}
          title={a.label}
          subtitle={a.publication}
          accessories={a.id === defaultId ? [{ text: "Default" }] : []}
          actions={
            <ActionPanel>
              <Action.Push
                shortcut={Keyboard.Shortcut.Common.Edit}
                title="Edit Account"
                target={<AccountForm accountId={a.id} onSaved={refresh} />}
              />
              {add}
              <Action
                title="Set as Default"
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "d" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                }}
                onAction={() => change(() => setDefaultAccount(a.id))}
              />
              <Action
                title="Remove Account"
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: "Remove this connection?",
                      message: "Its local recovery links will be removed. Remote drafts stay in Substack.",
                      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
                    })
                  )
                    await change(() => removeAccount(a.id));
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
