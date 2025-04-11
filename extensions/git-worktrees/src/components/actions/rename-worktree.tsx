import { CACHE_KEYS } from "#/config/constants";
import { Worktree, type Project } from "#/config/types";
import { updateCache } from "#/helpers/cache";
import { isExistingDirectory } from "#/helpers/file";
import { checkIfBranchNameIsValid, fetch, getRemoteBranches, renameWorktree, shouldPushWorktree } from "#/helpers/git";
import { getPreferences } from "#/helpers/raycast";
import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import path from "node:path";

type RenameWorktreeProps = {
  worktree: Worktree;
  revalidateProjects: () => void;
};

export const RenameWorktree = ({ worktree, revalidateProjects }: RenameWorktreeProps) => {
  const { push } = useNavigation();

  return (
    <Action
      title="Rename Worktree"
      icon={Icon.Pencil}
      shortcut={{ key: "r", modifiers: ["cmd"] }}
      onAction={() => push(<RenameForm worktree={worktree} revalidateProjects={revalidateProjects} />)}
    />
  );
};

const RenameForm = ({ worktree, revalidateProjects }: RenameWorktreeProps) => {
  const { pop } = useNavigation();

  const worktreePath = worktree.path;
  const currentName = path.basename(worktreePath);
  const projectPath = path.dirname(worktreePath);
  const projectName = path.basename(projectPath);

  const { handleSubmit, itemProps, setValidationError } = useForm<{ newName: string }>({
    onSubmit: async (values) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Renaming Worktree",
        message: "Validating worktree details",
      });

      try {
        const newPath = path.join(projectPath, values.newName);

        await fetch(worktreePath);

        const [isExistingWorktree, isBranchNameValid, remoteBranches] = await Promise.all([
          isExistingDirectory(newPath),
          checkIfBranchNameIsValid({ path: worktreePath, name: values.newName }),
          getRemoteBranches({ path: worktreePath }),
        ]);

        if (isExistingWorktree) {
          setValidationError("newName", `Worktree ${values.newName} already exists`);
          return toast.hide();
        }

        if (!isBranchNameValid) {
          setValidationError("newName", `Invalid branch name: ${values.newName}`);
          return toast.hide();
        }

        if (remoteBranches.find((worktree) => worktree === values.newName)) {
          setValidationError("newName", `Worktree ${values.newName} already exists on remote`);
          return toast.hide();
        }

        toast.message = `Renaming from "${currentName}" to "${values.newName}"`;

        await renameWorktree({
          parentPath: projectPath,
          currentName,
          newName: values.newName,
        });

        await shouldPushWorktree({
          path: newPath,
          branch: values.newName,
          onAccept: () => {
            toast.message = `Pushing new worktree "${values.newName}" to remote`;
          },
        });

        toast.style = Toast.Style.Success;
        toast.title = "";
        toast.message = `Successfully renamed to "${values.newName}"`;

        if (getPreferences().enableWorktreeCaching) {
          await updateCache<Project[]>({
            key: CACHE_KEYS.WORKTREES,
            updater: (projects) => {
              if (!projects) return;

              const foundProject = projects.find((project) => project.name === projectName);
              if (!foundProject) return;

              const foundWorktree = foundProject.worktrees.find((wt) => wt.id === worktree.id);
              if (!foundWorktree) return;

              foundWorktree.id = path.join(foundProject.fullPath, values.newName);
              foundWorktree.path = path.join(foundProject.fullPath, values.newName);
              foundWorktree.branch = values.newName;

              return projects;
            },
          });

          revalidateProjects();
        }

        toast.hide();

        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to Rename";
        toast.message = error instanceof Error ? error.message : "Unknown error occurred";
      }
    },
    validation: {
      newName: (value) => {
        if (!value || value.trim() === "") return "Name cannot be empty";
        if (value === currentName) return "New name must be different from current name";

        // Check if directory with new name already exists
        const newPath = path.join(projectPath, value);
        if (isExistingDirectory(newPath)) {
          return `A directory with the name "${value}" already exists`;
        }
      },
    },
    initialValues: {
      newName: currentName,
    },
  });

  return (
    <Form
      navigationTitle="Rename Worktree"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Current worktree name: ${currentName}`} />

      <Form.TextField
        title="New Name"
        placeholder="Enter new worktree name"
        info="The new name for the worktree directory"
        {...itemProps.newName}
        autoFocus
      />

      <Form.Separator />

      <Form.Description text="This will rename the worktree and the branch name." />
    </Form>
  );
};
