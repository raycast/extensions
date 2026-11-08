import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import type { LauncherApplication } from "../models/application";
import { useLauncherState } from "../hooks/useLauncherState";
import { launchApplication } from "../services/applications";
import { assignmentFor, moveApplication } from "../services/application-model";
import { GlobalActions } from "./GlobalActions";
import { FolderPicker } from "./FolderPicker";
import { perform } from "./feedback";
import type { ViewMode } from "../services/view-preference";

export function AppItem({
  app,
  folderId,
  viewMode,
  iconPath,
  iconPending,
  itemId = app.id,
}: {
  app: LauncherApplication;
  folderId: string | null;
  viewMode: ViewMode;
  iconPath?: string;
  iconPending?: boolean;
  itemId?: string;
}) {
  const { state, update, status } = useLauncherState();
  const assignedFolder = assignmentFor(app, state)?.folderId ?? null;
  const actions = (
    <ActionPanel title={app.name}>
      <Action
        title="Open Application"
        icon={Icon.AppWindow}
        onAction={() => perform("Could Not Open Application", () => launchApplication(app))}
      />
      <Action.ShowInFinder path={app.path} shortcut={{ modifiers: ["cmd"], key: "return" }} />
      {status === "ready" && (
        <ActionPanel.Section title="Organize">
          <Action.Push
            title="Move to Folder"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            target={<FolderPicker app={app} />}
          />
          {assignedFolder !== null && (
            <Action
              title="Move to Root"
              icon={Icon.House}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              onAction={() => perform("Could Not Move Application", () => update((s) => moveApplication(s, app, null)))}
            />
          )}
        </ActionPanel.Section>
      )}
      <GlobalActions folderId={folderId} />
    </ActionPanel>
  );
  return viewMode === "list" ? (
    <List.Item
      id={itemId}
      title={app.name}
      subtitle={app.hasMultipleInstallations ? app.path.replace(/\/[^/]+$/, "") : undefined}
      icon={{ fileIcon: app.path }}
      actions={actions}
    />
  ) : (
    <Grid.Item
      id={itemId}
      title={viewMode === "grid-large" ? app.name : undefined}
      content={{
        value:
          viewMode === "grid-large" && iconPath
            ? { source: iconPath }
            : viewMode === "grid-large" && iconPending
              ? { color: "rgba(0, 0, 0, 0)" }
              : { fileIcon: app.path },
        tooltip: app.hasMultipleInstallations ? `${app.name}\n${app.path}` : app.name,
      }}
      actions={actions}
    />
  );
}
