import {
  Action,
  ActionPanel,
  getPreferenceValues,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getWorkspaces,
  workspaceUrl,
  type AffineWorkspace,
} from "./affine-api";

export default function OpenWorkspaceCommand() {
  const [workspaces, setWorkspaces] = useState<AffineWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { baseUrl, apiToken } = getPreferenceValues<{
    baseUrl: string;
    apiToken: string;
  }>();

  useEffect(() => {
    if (!apiToken) {
      setError("Set API Token in extension preferences.");
      setLoading(false);
      return;
    }
    getWorkspaces(baseUrl, apiToken)
      .then(setWorkspaces)
      .catch((e) => {
        setError(e.message);
        showToast(Toast.Style.Failure, "Failed to load workspaces", e.message);
      })
      .finally(() => setLoading(false));
  }, [baseUrl, apiToken]);

  if (error) {
    return (
      <List>
        <List.EmptyView title="Error" description={error} icon="⚠️" />
      </List>
    );
  }

  return (
    <List isLoading={loading}>
      {workspaces.map((ws) => (
        <List.Item
          key={ws.id}
          title={ws.id}
          subtitle={ws.public ? "Public" : "Private"}
          accessories={[
            {
              text: new Date(ws.createdAt).toLocaleDateString(),
            },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={workspaceUrl(baseUrl, ws.id)}
                title="Open Workspace in Browser"
              />
            </ActionPanel>
          }
        />
      ))}
      {!loading && workspaces.length === 0 && (
        <List.EmptyView
          title="No workspaces"
          description="No AFFiNE workspaces found for this account"
        />
      )}
    </List>
  );
}
