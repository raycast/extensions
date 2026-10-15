import { isApiKeyAuth, plane, planeClient, selectWorkspace } from "../api/auth";
import { withAccessToken } from "@raycast/utils";
import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import WorkspaceSlugForm from "./WorkspaceSlugForm";

/**
 * Renders children once a workspace is selected.
 * `withAccessToken` runs `onAuthorize` first, which restores the stored slug into `planeClient`.
 */
function AuthorizedView({ children }: { children: React.ReactNode }) {
  const [workspaceSlug, setWorkspaceSlug] = useState<string | undefined>(planeClient?.workspaceSlug);

  async function handleWorkspaceSlugSubmit(slug: string) {
    await selectWorkspace(slug);
    setWorkspaceSlug(slug);
  }

  if (!workspaceSlug) {
    if (isApiKeyAuth()) {
      return <WorkspaceSlugForm onWorkspaceSlugSubmit={handleWorkspaceSlugSubmit} />;
    }
    return (
      <List>
        <List.EmptyView
          icon={Icon.House}
          title="No Plane workspace found"
          description="Install the Raycast app in a Plane workspace, or set an API key in the extension preferences."
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <>{children}</>;
}

export default withAccessToken(plane)(AuthorizedView);
