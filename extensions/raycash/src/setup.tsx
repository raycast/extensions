import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { claimSetupToken } from "./simplefin";

const BRIDGE_URL = "https://beta-bridge.simplefin.org/";

/**
 * Shows the claimed Access URL and gets it into the (encrypted) preference.
 *
 * Raycast has no API for writing a preference, so the URL cannot be stored
 * automatically — but copying it and opening the preferences pane turns the
 * old terminal dance into one paste.
 */
function ClaimedView({ accessUrl }: { accessUrl: string }) {
  return (
    <Detail
      navigationTitle="Access URL"
      markdown={[
        "# Access URL claimed",
        "",
        "It is on your clipboard. Paste it into **SimpleFIN Access URL** in the preferences pane, which is opening now.",
        "",
        "```",
        accessUrl,
        "```",
        "",
        "This URL is a permanent, read-only credential for every account you linked. Treat it like a password: Raycast stores it encrypted, but anyone who sees it can read your accounts.",
        "",
        "If it ever leaks, delete the connection on the bridge and set up again.",
      ].join("\n")}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Access URL" content={accessUrl} />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          <Action.OpenInBrowser
            title="Open SimpleFIN Bridge"
            url={BRIDGE_URL}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { push } = useNavigation();
  const [isClaiming, setIsClaiming] = useState(false);

  const claim = async (token: string) => {
    setIsClaiming(true);
    try {
      const accessUrl = await claimSetupToken(token);
      await Clipboard.copy(accessUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "Access URL Copied",
        message: "Paste it into the preference that just opened",
      });
      push(<ClaimedView accessUrl={accessUrl} />);
      await openExtensionPreferences();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Claim Token",
        message: (err as Error).message,
      });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Form
      isLoading={isClaiming}
      navigationTitle="Set Up RayCash"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Claim Setup Token"
            icon={Icon.Key}
            onSubmit={(values) => claim(String(values.token ?? ""))}
          />
          <Action.OpenInBrowser
            title="Get a Setup Token"
            url={BRIDGE_URL}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={[
          "1.  Open the SimpleFIN Bridge (⌘O) and sign in.",
          "2.  Link your institutions.",
          "3.  My Account → Apps → New Connection → Create Setup Token.",
          "4.  Paste the token below.",
          "",
          "Setup tokens are single-use. Claiming one here consumes it, and the",
          "Access URL you get back is what the extension uses from then on.",
        ].join("\n")}
      />
      <Form.PasswordField
        id="token"
        title="Setup Token"
        placeholder="aHR0cHM6Ly9iZXRhLWJyaWRnZS5zaW1wbGVmaW4ub3JnL3NpbXBsZWZpbi9jbGFpbS8..."
      />
    </Form>
  );
}
