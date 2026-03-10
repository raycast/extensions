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
  getWorkspaceDocs,
  docUrl,
  desktopAppUrl,
  type AffineDoc,
} from "./affine-api";

export default function OpenDocCommand() {
  const [docs, setDocs] = useState<AffineDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { baseUrl, apiToken, workspaceId } = getPreferenceValues<{
    baseUrl: string;
    apiToken: string;
    workspaceId?: string;
  }>();

  useEffect(() => {
    if (!apiToken) {
      setError("Set API Token in extension preferences.");
      setLoading(false);
      return;
    }
    if (!workspaceId?.trim()) {
      setError(
        "Set Default Workspace ID in extension preferences to list documents.",
      );
      setLoading(false);
      return;
    }
    getWorkspaceDocs(baseUrl, apiToken, workspaceId)
      .then(setDocs)
      .catch((e) => {
        setError(e.message);
        showToast(Toast.Style.Failure, "Failed to load documents", e.message);
      })
      .finally(() => setLoading(false));
  }, [baseUrl, apiToken, workspaceId]);

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Configuration needed"
          description={error}
          icon="⚠️"
        />
      </List>
    );
  }

  return (
    <List isLoading={loading}>
      {docs.map((doc) => {
        const url = docUrl(baseUrl, workspaceId!, doc.id);
        const desktopUrl = desktopAppUrl(baseUrl, workspaceId!, doc.id);
        return (
          <List.Item
            key={doc.id}
            title={doc.title || "Untitled"}
            accessories={[
              {
                text: new Date(doc.updatedAt).toLocaleDateString(),
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  url={desktopUrl}
                  title="Open in Desktop App"
                />
                <Action.OpenInBrowser url={url} title="Open in Browser" />
                <Action.CopyToClipboard
                  content={desktopUrl}
                  title="Copy Desktop App URL"
                />
                <Action.CopyToClipboard content={url} title="Copy Affine URL" />
              </ActionPanel>
            }
          />
        );
      })}
      {!loading && docs.length === 0 && (
        <List.EmptyView
          title="No documents"
          description="No documents in the default workspace"
        />
      )}
    </List>
  );
}
