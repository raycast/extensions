import "./lib/patch-url.js";

import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { listWorkspaces } from "./lib/subnoto.js";
import type { Preferences, Workspace } from "./lib/types.js";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function loadWorkspaces() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listWorkspaces(preferences);
      setWorkspaces(data);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load workspaces",
        message: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspaces();
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title={error ? "Failed to load workspaces" : "No workspaces"}
        description={error ? error.message : "You don't have any Subnoto workspaces yet."}
      />
      {workspaces.map((workspace) => (
        <List.Item
          key={workspace.uuid}
          title={workspace.name}
          subtitle={`${workspace.membersCount} member${workspace.membersCount !== 1 ? "s" : ""}`}
          accessories={[{ text: workspace.uuid }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={`https://app.subnoto.com/envelopes/${workspace.uuid}/all`}
                title="Open in Subnoto"
              />
              <Action.CopyToClipboard content={workspace.uuid} title="Copy Workspace UUID" />
              <Action title="Refresh" onAction={() => loadWorkspaces()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
