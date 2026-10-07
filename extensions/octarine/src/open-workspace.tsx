import { Action, Icon, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { WorkspaceList } from "@components/workspace-list";
import { useOpenTarget } from "@hooks/use-open-target";
import { useWorkspaces } from "@hooks/use-workspaces";
import { openWorkspace } from "@lib/octarine";

export default function OpenWorkspaceCommand(props: LaunchProps<{ arguments: Partial<Arguments.OpenWorkspace> }>) {
  const requestedWorkspace = props.arguments.workspace?.trim() ?? "";
  const [refresh, setRefresh] = useState(false);
  const { workspaces, status, revalidate } = useWorkspaces({ refresh });
  const onRefresh = () => (refresh ? revalidate() : setRefresh(true));

  useOpenTarget({
    requestedWorkspace,
    workspaces,
    status,
    open: openWorkspace,
  });

  return (
    <WorkspaceList isLoading={status.isLoading} workspaces={workspaces} onRefresh={onRefresh}>
      {(workspace) => (
        <Action title="Open Workspace" icon={Icon.AppWindow} onAction={() => openWorkspace(workspace.name)} />
      )}
    </WorkspaceList>
  );
}
