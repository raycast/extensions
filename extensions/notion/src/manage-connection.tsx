import { Action, ActionPanel, Detail, Icon, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import { showNotionError } from "./utils/notion/errors";
import { checkNotionConnection, notionService, reconnectNotion } from "./utils/notion/oauth";

export default function ManageConnection() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const {
    data: connected,
    error,
    isLoading,
    revalidate,
  } = usePromise(checkNotionConnection, [], {
    onError: (error) => void showNotionError(error, "Could not verify Notion connection"),
  });
  const usesSecret = !!notionService.personalAccessToken;
  const status = error
    ? "Could not verify your connection. Check your network and try again, or reconnect if access was revoked."
    : connected
      ? "Your connection is working."
      : "No saved Notion connection was found.";
  const instructions = usesSecret
    ? "You are using an Internal Integration Secret. Update it in extension preferences if it is invalid. To use browser sign-in instead, clear the secret and reopen this command."
    : "Use Reconnect Notion to sign in again and choose the pages Raycast can access. This replaces your saved sign-in.";

  async function reconnect() {
    if (isReconnecting) return;
    setIsReconnecting(true);
    try {
      await reconnectNotion();
      await revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: "Connected to Notion",
        message: "Reopen your Notion command.",
      });
    } catch (error) {
      await showNotionError(error, "Could not reconnect to Notion");
      await revalidate();
    } finally {
      setIsReconnecting(false);
    }
  }

  return (
    <Detail
      isLoading={isLoading || isReconnecting}
      markdown={`# Notion connection\n\n${isLoading ? "Checking your connection…" : status}\n\n${instructions}\n\nTo change access for an internal integration, add or remove its connection on the relevant pages in Notion.`}
      actions={
        <ActionPanel>
          {usesSecret ? (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          ) : (
            <Action title="Reconnect Notion" icon={Icon.ArrowClockwise} onAction={reconnect} />
          )}
          <Action title="Test Connection" icon={Icon.CheckCircle} onAction={() => revalidate()} />
          <Action.OpenInBrowser
            title="Manage Page Access"
            url="https://www.notion.so/help/add-and-manage-connections-with-the-api#add-connections-to-pages"
          />
        </ActionPanel>
      }
    />
  );
}
