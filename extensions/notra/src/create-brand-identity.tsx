import { CreateBrandIdentityForm } from "./components/create-brand-identity-form";
import { WorkspaceFormDropdown } from "./components/workspace-switcher";
import { useWorkspace } from "./hooks/use-workspace";

export default function Command() {
  const { isLoading, switchWorkspace, workspace, workspaces } = useWorkspace();

  return (
    <CreateBrandIdentityForm
      isLoading={isLoading}
      workspacePicker={
        <WorkspaceFormDropdown onChange={switchWorkspace} workspace={workspace} workspaces={workspaces} />
      }
    />
  );
}
