import { Action, Icon } from "@raycast/api";
import { useState } from "react";
import { useWorkspaces } from "@hooks/use-workspaces";
import { openDailyDeskNotePreferences } from "@lib/preferences";
import { WorkspaceList } from "@components/workspace-list";
import { useLastWorkspace } from "../hooks/use-last-workspace";
import { useOpenDailyNote } from "../hooks/use-open-note";

type Props = {
  date: string;
  requestedWorkspace: string;
};

export function DailyDeskOpen({ date, requestedWorkspace }: Props) {
  const preferences = openDailyDeskNotePreferences();
  const [refresh, setRefresh] = useState(false);
  const { workspaces, status, revalidate } = useWorkspaces({ refresh });
  const { remember: rememberWorkspace } = useLastWorkspace({
    workspaces,
    enabled: preferences.useLastWorkspace,
  });
  const openDailyNote = useOpenDailyNote({
    date,
    requestedWorkspace: requestedWorkspace || preferences.defaultWorkspace,
    workspaces,
    status,
    onWorkspaceOpened: rememberWorkspace,
  });
  const onRefresh = () => (refresh ? revalidate() : setRefresh(true));

  return (
    <WorkspaceList isLoading={status.isLoading} workspaces={workspaces} onRefresh={onRefresh}>
      {(workspace) => (
        <Action
          title="Open Daily Desk Note"
          icon={Icon.AppWindow}
          onAction={() => void openDailyNote(date, workspace.name)}
        />
      )}
    </WorkspaceList>
  );
}
