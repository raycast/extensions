import { CreateGitHubIntegrationForm } from "./components/create-git-hub-integration-form";
import { WorkspaceFormDropdown } from "./components/workspace-switcher";
import { useWorkspace } from "./hooks/use-workspace";

export default function Command() {
  const { isLoading, switchWorkspace, workspace, workspaces } = useWorkspace();

  return (
    <CreateGitHubIntegrationForm
      isLoading={isLoading}
      workspacePicker={
        <WorkspaceFormDropdown onChange={switchWorkspace} workspace={workspace} workspaces={workspaces} />
      }
    />
  );
}
