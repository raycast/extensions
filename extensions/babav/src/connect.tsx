// Raycast setup B (locked 2026-09-26): shown by every command until a Connection Key is in place.
// "Connect your BABAV account" + three steps (Get my key ↗ · Copy key · Paste your Connection Key),
// brand + "Works with" on the right, "Get my key ↵" as the primary action.
// Raycast draws its own chrome, so the steps are Markdown and the right column is Detail metadata.
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ComponentType, useState } from "react";
import {
  api,
  connectionKey,
  KEY_PAGE_URL,
  looksLikeKey,
  signInUrl,
  maskKey,
  Me,
  savePastedKey,
  setActiveBrand,
} from "./api";

const WORKS_WITH = "Quick Reply · Find Person · Approve Queue · Hot Leads · Add Lead · Book a Meeting";

const SETUP_MD = `# Connect your BABAV account

Find people, approve replies and write in your brand voice — right from Raycast.

**1 · Get my key ↗**
Opens BABAV › Settings › Extensions & apps in your browser.

**2 · Copy key**
One click. It starts with \`bvk_\`.

**3 · Paste your Connection Key**
Come back and press ↵. You’ll see ✓ Connected as your brand.
`;

export function ConnectView({ onConnected }: { onConnected?: () => void }) {
  return (
    <Detail
      navigationTitle="BABAV"
      markdown={SETUP_MD}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Brand" text="Not connected yet" />
          <Detail.Metadata.Label title="Works with" text={WORKS_WITH} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Get My Key" url={KEY_PAGE_URL} />
          <Action.OpenInBrowser title="Sign in with BABAV" icon={Icon.Mobile} url={signInUrl()} />
          <Action.Push
            title="Paste Your Connection Key"
            icon={Icon.Key}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "v" }, Windows: { modifiers: ["ctrl"], key: "v" } }}
            target={<PasteKeyForm onConnected={onConnected} />}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

export function PasteKeyForm({ onConnected }: { onConnected?: () => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();
  async function submit(values: { key: string }) {
    const key = (values.key || "").trim();
    // KeyStates · wrong key — same words as the extensions.
    if (!looksLikeKey(key)) {
      setError("That doesn’t look like a Connection Key. It starts with bvk_ and is on Settings › Extensions & apps.");
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking your key…" });
    try {
      const me = await api<Me>("/me", { key });
      await savePastedKey(key);
      await setActiveBrand("", "");
      toast.style = Toast.Style.Success;
      toast.title = `✓ Connected as ${me.brand || "your brand"}`;
      pop();
      onConnected?.();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "That key didn’t work";
      toast.message = maskKey(key);
      setError((e as Error).message);
    }
  }
  return (
    <Form
      navigationTitle="Paste your Connection Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" icon={Icon.Plug} onSubmit={submit} />
          <Action.OpenInBrowser title="Get My Key" url={KEY_PAGE_URL} />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="key"
        title="Connection Key"
        placeholder="bvk_..."
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Description text="Settings › Extensions & apps › Copy key. The same key BABAV Finder and BABAV Compose use." />
    </Form>
  );
}

/** Wrap a command: no key yet → the Connect screen; key in place → the command itself. */
export function withConnection<P extends object>(Command: ComponentType<P>) {
  return function Connected(props: P) {
    const { data: key, isLoading, revalidate } = usePromise(connectionKey, []);
    if (isLoading && key === undefined) return <Detail isLoading markdown="" navigationTitle="BABAV" />;
    if (!key) return <ConnectView onConnected={revalidate} />;
    return <Command {...props} />;
  };
}
