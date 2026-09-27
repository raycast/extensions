import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { ReactNode } from "react";
import { appToStart, baseUrl, isLocalServer } from "../lib/osaurus";
import { OSAURUS_DOWNLOAD_URL, openOsaurusWithToast } from "../lib/server-toast";

// Empty state for a stopped server. With no Osaurus installed at all (a first run), it invites
// the user to download it instead of offering to open an app that isn't there.
export function ServerDownEmptyView({ onReady, actions }: { onReady: () => void; actions?: ReactNode }) {
  const local = isLocalServer();
  const { data: app, isLoading } = usePromise(appToStart, [], { execute: local });

  // A remote server can't be opened from here, and no local install is needed for it.
  if (!local) {
    return (
      <List.EmptyView
        icon={Icon.Plug}
        title="Can't reach the Osaurus server"
        description={`Nothing answered at ${baseUrl()}. Check that the server is running and reachable, or change Server URL in the extension's preferences.`}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onReady} />
            {actions}
          </ActionPanel>
        }
      />
    );
  }
  if (!isLoading && !app) {
    return (
      <List.EmptyView
        icon="extension-icon.png"
        title="Get Osaurus"
        description="Osaurus runs AI models privately on your Mac. Download it from osaurus.ai, then come back here."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Download Osaurus" url={OSAURUS_DOWNLOAD_URL} />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <List.EmptyView
      icon={Icon.Plug}
      title="Osaurus isn't running"
      description="Press ↵ to open Osaurus. Your models load when its server starts."
      actions={
        <ActionPanel>
          <Action title="Open Osaurus" icon={Icon.Play} onAction={() => openOsaurusWithToast(onReady)} />
          {actions}
        </ActionPanel>
      }
    />
  );
}
