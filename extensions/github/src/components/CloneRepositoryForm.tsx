import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

import { Action, ActionPanel, closeMainWindow, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect } from "react";

import { getGitHubClient } from "../api/githubClient";
import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";

type CloneRepositoryFormProps = {
  repository: ExtendedRepositoryFieldsFragment;
};

export default function CloneRepositoryForm({ repository }: CloneRepositoryFormProps) {
  const { octokit } = getGitHubClient();
  const { application } = getPreferenceValues<Preferences.SearchRepositories>();

  const { data: branches, isLoading } = useCachedPromise(
    async (repo) => {
      const response = await octokit.repos.listBranches({
        owner: repo.owner.login,
        repo: repo.name,
      });

      return response.data.map((b) => b.name);
    },
    [repository],
  );

  const { itemProps, handleSubmit, setValue } = useForm<{
    clonePath: string[];
    branch: string;
    ssh: boolean;
  }>({
    async onSubmit(values) {
      const repoName = repository.name;

      const targetDir = path.join(values.clonePath[0], repoName);

      await showToast({
        title: `Cloning ${repository.nameWithOwner} to ${targetDir}`,
        style: Toast.Style.Animated,
      });

      const cloneUrl = values.ssh
        ? `git@github.com:${repository.nameWithOwner}.git`
        : `https://github.com/${repository.nameWithOwner}`;

      const branchOption = values.branch ? `-b ${values.branch}` : "";
      const cloneCommand = `git clone ${branchOption} ${cloneUrl} ${targetDir}`;

      const execAsync = promisify(exec);

      try {
        await execAsync(cloneCommand);
        await showToast({
          style: Toast.Style.Success,
          title: "Repository cloned successfully",
          primaryAction: {
            title: "Open Repository",
            async onAction() {
              const applicationPath = application?.path.replaceAll(" ", "\\ ");
              const openCommand = `open -a ${applicationPath} ${targetDir}`;
              await execAsync(openCommand);
              await closeMainWindow();
            },
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("Repository not found")) {
          await showFailureToast(error, {
            title: "Repository not found",
            message: "You may not have access to this repository. Try using SSH instead of HTTPS.",
          });
          return;
        }

        if (error instanceof Error && error.message.includes("already exists")) {
          await showFailureToast(error, {
            title: "The repository already exists",
            message: "Please choose a different directory to clone the repository.",
          });
          return;
        }

        await showFailureToast(error, { title: "Failed cloning repository" });
      }
    },
  });

  useEffect(() => {
    const mainBranch = branches?.find((b) => b === "main");
    const masterBranch = branches?.find((b) => b === "master");

    if (mainBranch || masterBranch) {
      setValue("branch", mainBranch ?? masterBranch ?? "");
    }
  }, [branches]);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Clone ${repository.nameWithOwner}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clone and Open Repository" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        {...itemProps.clonePath}
        title="Clone Path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        storeValue
      />
      <Form.Dropdown {...itemProps.branch} title="Branch Name">
        {branches?.map((b) => <Form.Dropdown.Item key={b} value={b} title={b} />)}
      </Form.Dropdown>
      <Form.Checkbox {...itemProps.ssh} label="Use SSH instead of HTTPS" storeValue />
    </Form>
  );
}
