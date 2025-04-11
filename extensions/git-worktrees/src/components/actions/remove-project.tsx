import { type BareRepository } from "#/config/types";
import { removeProjectFromCache } from "#/helpers/cache";
import { removeDirectory } from "#/helpers/file";
import { Action, Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";

export const RemoveProject = ({
  project,
  revalidateProjects,
}: {
  project: BareRepository | undefined;
  revalidateProjects: () => void;
}) => {
  if (!project) return null;

  const handleRemoveProject = async (project: BareRepository) => {
    const options: Alert.Options = {
      title: "Remove Project",
      message: `Are you sure you want to remove ${project.name} and all worktrees?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    };
    const confirmed = await confirmAlert(options);
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing Project",
      message: "Please wait while the project is being removed",
    });

    try {
      await removeDirectory({ path: project.fullPath, recursive: true, force: true });
      removeProjectFromCache({ projectName: project.name, onSuccess: revalidateProjects });

      toast.style = Toast.Style.Success;
      toast.title = "Successfully Removed";
      toast.message = "The project has been removed";
    } catch (e) {
      if (!(e instanceof Error)) throw e;

      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Remove";
      toast.message = e.message;
    }
  };

  return (
    <Action
      title="Remove Project"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      onAction={() => handleRemoveProject(project)}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
    />
  );
};
