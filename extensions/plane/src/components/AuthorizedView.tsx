import { isApiKeyAuth, plane, planeClient, selectWorkspace } from "../api/auth";
import { withAccessToken } from "@raycast/utils";
import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { Fragment, useEffect, useState } from "react";
import WorkspaceSlugForm from "./WorkspaceSlugForm";
import { onWorkspaceChange } from "../helpers/workspace-events";

/**
 * Renders children once a workspace is selected.
 * `withAccessToken` runs `onAuthorize` first, which restores the stored slug into `planeClient`.
 * "Change Workspace" (⌘⇧W) emits a change event; children remount with the new workspace.
 */
function AuthorizedView({ children }: { children: React.ReactNode }) {
  const [workspaceSlug, setWorkspaceSlug] = useState<string | undefined>(planeClient?.workspaceSlug);
  const [generation, setGeneration] = useState(0);

  useEffect(
    () =>
      onWorkspaceChange((slug) => {
        setWorkspaceSlug(slug);
        setGeneration((value) => value + 1);
      }),
    [],
  );

  if (!workspaceSlug) {
    if (isApiKeyAuth()) {
      return <WorkspaceSlugForm onWorkspaceSlugSubmit={selectWorkspace} />;
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

  return <Fragment key={`${workspaceSlug}:${generation}`}>{children}</Fragment>;
}

export default withAccessToken(plane)(AuthorizedView);
