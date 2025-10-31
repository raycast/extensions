import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Icon,
  LaunchProps,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { join } from "path";
import { useRepositoriesList } from "./hooks/useRepositoriesList";
import { GitManager } from "./utils/git-manager";
import { existsSync } from "fs";
import { resolveTildePath } from "./utils/path-utils";

interface CloneRepositoryArguments {
  url: string;
}

export default function CloneRepository(props: LaunchProps<{ arguments: CloneRepositoryArguments }>) {
  const [url, setUrl] = useState(props.arguments.url);
  const [parentDirectory, setParentDirectory] = useCachedState<string | undefined>("clone-parent-directory", undefined);
  const { addRepository } = useRepositoriesList();

  const targetDirectory = useMemo(() => {
    if (!parentDirectory) {
      return undefined;
    }
    const repoName = extractRepoNameFromUrl(url);
    return join(parentDirectory, repoName);
  }, [url, parentDirectory]);

  const validateRepositoryPath = useMemo(() => {
    if (!parentDirectory) {
      return "Required";
    }
    // Check if repository already exists
    if (targetDirectory && existsSync(targetDirectory)) {
      return `Directory "${targetDirectory}" already exists`;
    }

    return undefined;
  }, [url, targetDirectory]);

  const handleSubmit = async () => {
    if (!targetDirectory) {
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Starting Clone",
    });

    try {
      const resolvedTargetDirectory = resolveTildePath(targetDirectory);
      // Start non-blocking clone process (init + fetch via GitManager)
      const cloningProcess = await GitManager.startCloneRepository(url, resolvedTargetDirectory);

      // Add to cloning repositories list
      addRepository(resolvedTargetDirectory, cloningProcess);

      // Navigate to manage repositories to show progress
      launchCommand({ name: "manage-repositories", type: LaunchType.UserInitiated });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Start Clone",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      navigationTitle="Clone Git Repository"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clone Repository" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        value={url}
        onChange={(value) => setUrl(value)}
        error={url.trim().length === 0 ? "Required" : undefined}
        placeholder="https://github.com/user/your-repo.git"
      />
      <Form.Separator />
      <Form.FilePicker
        id="parentDirectory"
        title="Parent Directory"
        value={parentDirectory ? [parentDirectory] : []}
        error={validateRepositoryPath}
        onChange={(paths) => setParentDirectory(paths[0] || undefined)}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />

      {targetDirectory && <Form.Description title="Target Directory" text={targetDirectory} />}
    </Form>
  );
}

/**
 * Extracts repository name from git URL.
 * Handles both HTTPS and SSH URLs.
 */
function extractRepoNameFromUrl(url: string): string {
  // Regular expression to extract repository name from URL
  // Supports HTTPS and SSH formats URLs
  const repoNameRegex = /(?:\/|:)(?<repoName>[^/]+?)(?:\.git)?$/;
  const match = url.match(repoNameRegex);

  // Extract repository name from named capture group
  if (match && match.groups && match.groups.repoName) {
    return match.groups.repoName;
  }

  // Default value if not found
  return "repository";
}
