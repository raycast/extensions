import { Action, ActionPanel, confirmAlert, Form, Icon, useNavigation, Alert } from "@raycast/api";
import { Submodule } from "../../types";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { useState } from "react";
import { extractRepoNameFromUrl, validateGitUrl } from "../../utils/url-utils";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Action for adding a new submodule.
 */
export function SubmoduleAddAction(context: RepositoryContext & NavigationContext) {
  return (
    <Action.Push
      title="Add New Submodule"
      icon={Icon.Plus}
      target={<AddSubmoduleForm {...context} />}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}

/**
 * Action for updating a specific submodule.
 */
export function SubmoduleUpdateAction(context: RepositoryContext & NavigationContext & { submodule: Submodule }) {
  const handleUpdateSubmodule = async () => {
    try {
      await context.gitManager.updateSubmodule(context.submodule.relativePath);
      context.submodules.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Update Submodule"
      icon={Icon.Download}
      onAction={handleUpdateSubmodule}
      shortcut={{ modifiers: ["cmd"], key: "u" }}
    />
  );
}

/**
 * Action for updating all submodules.
 */
export function SubmodulesUpdateAllAction(context: RepositoryContext & NavigationContext) {
  const handleUpdateAllSubmodules = async () => {
    try {
      await context.gitManager.updateAllSubmodules();
      context.submodules.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Update All Submodules"
      icon={Icon.Download}
      onAction={handleUpdateAllSubmodules}
      shortcut={{ modifiers: ["shift", "cmd"], key: "u" }}
    />
  );
}

/**
 * Action for deleting a submodule.
 */
export function SubmoduleDeleteAction(context: RepositoryContext & NavigationContext & { submodule: Submodule }) {
  const handleDeleteSubmodule = async () => {
    if (
      await confirmAlert({
        title: "Delete Submodule",
        message: `Are you sure you want to delete submodule "${context.submodule.name}"? This will remove it from the repository.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      try {
        await context.gitManager.deleteSubmodule(context.submodule.relativePath);
        context.submodules.revalidate();
      } catch {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <Action
      title="Delete Submodule"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      onAction={handleDeleteSubmodule}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
}

/**
 * Form for adding a new submodule.
 */
function AddSubmoduleForm(context: RepositoryContext & NavigationContext) {
  const { pop } = useNavigation();
  const [url, setUrl] = useState("");
  const [path, setPath] = useState("");

  const validatePath = (path: string): string | undefined => {
    if (path.trim().length > 0 && existsSync(join(context.gitManager.repoPath, path.trim()))) return "Already exists";

    return undefined;
  };

  const handleSubmit = async (values: { url: string; path: string }) => {
    const repoName = extractRepoNameFromUrl(values.url.trim());
    const repoPath = values.path.trim().length > 0 ? values.path.trim() : `Submodules/${repoName}`;

    try {
      await context.gitManager.addSubmodule(values.url.trim(), repoPath);
      context.submodules.revalidate();
      pop();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Form
      navigationTitle="Add Submodule"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Submodule" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="git@github.com:user/repo.git or https://github.com/user/repo.git"
        value={url}
        onChange={setUrl}
        error={validateGitUrl(url)}
      />
      <Form.TextField
        id="path"
        title="Folder Path"
        placeholder={`Submodules/${extractRepoNameFromUrl(url)}`}
        value={path}
        onChange={setPath}
        error={validatePath(path)}
        info="Optional"
      />
    </Form>
  );
}
