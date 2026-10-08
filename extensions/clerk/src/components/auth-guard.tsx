import { Action, ActionPanel, Clipboard, Icon, List, Toast, showToast } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useEffect, useState } from "react";
import { AppForm } from "./app-form";
import { DASHBOARD_API_KEYS_URL, clientFor, defaultAppName, instanceTypeFromKey, isClerkSecretKey } from "../lib/clerk";
import { addApp } from "../lib/storage";
import { showClerkError } from "../lib/errors";

export function AuthActions(props: { onChanged: () => void }) {
  const [clipboardHasKey, setClipboardHasKey] = useState(false);

  useEffect(() => {
    (async () => {
      const text = (await Clipboard.readText()) ?? "";
      setClipboardHasKey(isClerkSecretKey(text));
    })();
  }, []);

  async function addFromClipboard() {
    const text = ((await Clipboard.readText()) ?? "").trim();
    if (!isClerkSecretKey(text)) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard has no Clerk secret key" });
      return;
    }
    const app = {
      id: randomUUID(),
      name: defaultAppName(text),
      instanceType: instanceTypeFromKey(text),
      secretKey: text,
    };
    const toast = await showToast({ style: Toast.Style.Animated, title: "Validating secret key" });
    try {
      await clientFor(app).users.getUserList({ limit: 1 });
      await addApp(app);
      toast.style = Toast.Style.Success;
      toast.title = `Added ${app.name}`;
      props.onChanged();
    } catch (error) {
      toast.hide();
      await showClerkError(error);
    }
  }

  return (
    <ActionPanel>
      {clipboardHasKey && <Action title="Add App from Clipboard" icon={Icon.Clipboard} onAction={addFromClipboard} />}
      <Action.Push title="Add App Manually…" icon={Icon.Plus} target={<AppForm onSaved={props.onChanged} />} />
      <Action.OpenInBrowser title="Open Clerk Dashboard → API Keys" url={DASHBOARD_API_KEYS_URL} />
    </ActionPanel>
  );
}

export function AuthGuard(props: { onChanged: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="No active Clerk app"
        description="Open the Clerk dashboard, copy a secret key, then add it here."
        actions={<AuthActions onChanged={props.onChanged} />}
      />
    </List>
  );
}
