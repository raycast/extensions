import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useEffect, useState } from "react";
import type { ClerkApp } from "../types";
import { DASHBOARD_API_KEYS_URL, clientFor, defaultAppName, instanceTypeFromKey, isClerkSecretKey } from "../lib/clerk";
import { addApp, updateApp } from "../lib/storage";
import { showClerkError } from "../lib/errors";

export function AppForm(props: { app?: ClerkApp; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const editing = !!props.app;
  const [name, setName] = useState(props.app?.name ?? "");
  const [secretKey, setSecretKey] = useState(props.app?.secretKey ?? "");
  const [loading, setLoading] = useState(false);

  // Prefill from clipboard on first mount (add mode only).
  useEffect(() => {
    if (editing) return;
    (async () => {
      const text = (await Clipboard.readText()) ?? "";
      if (isClerkSecretKey(text)) {
        setSecretKey(text.trim());
        setName((current) => current || defaultAppName(text));
      }
    })();
  }, [editing]);

  async function pasteFromClipboard() {
    const text = (await Clipboard.readText()) ?? "";
    if (!isClerkSecretKey(text)) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard has no Clerk secret key" });
      return;
    }
    setSecretKey(text.trim());
    setName((current) => current || defaultAppName(text));
  }

  async function submit() {
    const key = secretKey.trim();
    if (!isClerkSecretKey(key)) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a valid Clerk secret key" });
      return;
    }
    const finalName = name.trim() || defaultAppName(key);
    const app: ClerkApp = {
      id: props.app?.id ?? randomUUID(),
      name: finalName,
      instanceType: instanceTypeFromKey(key),
      secretKey: key,
    };
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Validating secret key" });
    try {
      await clientFor(app).users.getUserList({ limit: 1 });
      if (editing) await updateApp(app);
      else await addApp(app);
      toast.style = Toast.Style.Success;
      toast.title = editing ? "App updated" : "App added";
      props.onSaved?.();
      pop();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    } finally {
      setLoading(false);
    }
  }

  const detected = isClerkSecretKey(secretKey) ? instanceTypeFromKey(secretKey) : undefined;

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={editing ? "Save App" : "Add App"} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Clerk Dashboard → API Keys" url={DASHBOARD_API_KEYS_URL} />
          <Action title="Paste Secret Key from Clipboard" icon={Icon.Clipboard} onAction={pasteFromClipboard} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a Clerk instance by pasting its secret key. Open the dashboard to copy one." />
      <Form.TextField id="name" title="Name" placeholder="e.g. Acme Production" value={name} onChange={setName} />
      <Form.PasswordField
        id="secretKey"
        title="Secret Key"
        placeholder="sk_live_… or sk_test_…"
        value={secretKey}
        onChange={setSecretKey}
      />
      {detected && <Form.Description text={`Detected instance type: ${detected}`} />}
    </Form>
  );
}
