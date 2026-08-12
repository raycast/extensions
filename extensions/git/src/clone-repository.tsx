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
import { extractRepoNameFromUrl } from "./utils/url-utils";

interface CloneRepositoryArguments {
  url: string;
}

export default function CloneRepository(props: LaunchProps<{ arguments: CloneRepositoryArguments }>) {
  const [url, setUrl] = useState(props.arguments.url);
  const [parentDirectory, setParentDirectory] = useCachedState<string | undefined>("clone-parent-directory", undefined);
  const [targetDirectoryName, setTargetDirectoryName] = useState<string>();
  const { addRepository } = useRepositoriesList();

  const resolvedTargetDirectory = useMemo(() => {
    if (!parentDirectory) {
      return undefined;
    }

    if (!targetDirectoryName) {
      return join(parentDirectory, extractRepoNameFromUrl(url));
    }

    return join(parentDirectory, targetDirectoryName);
  }, [parentDirectory, targetDirectoryName]);

  const validateRepositoryPath = (): string | undefined => {
    if (!resolvedTargetDirectory) {
      return "Required";
    }
    if (existsSync(resolvedTargetDirectory)) {
      return `Already exists`;
    }

    return undefined;
  };

  const handleSubmit = async () => {
    if (!resolvedTargetDirectory) {
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Starting Clone",
    });

    try {
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
        error={parentDirectory ? undefined : "Required"}
        onChange={(paths) => setParentDirectory(paths[0] || undefined)}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />

      {parentDirectory && (
        <Form.TextField
          id="targetDirectory"
          title="Target Directory Name"
          value={targetDirectoryName}
          onChange={(value) => setTargetDirectoryName(value)}
          error={validateRepositoryPath()}
          placeholder={extractRepoNameFromUrl(url)}
          info="Optional"
        />
      )}
    </Form>
  );
}
