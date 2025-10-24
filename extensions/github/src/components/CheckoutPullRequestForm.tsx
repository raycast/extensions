import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";

import { AcceptableCloneProtocol, buildCloneCommand } from "../helpers/repository";

import { PullRequest } from "./PullRequestActions";

type CheckoutPullRequestFormProps = {
  pullRequest: PullRequest;
};

export default function CheckoutPullRequestForm({ pullRequest }: CheckoutPullRequestFormProps) {
  const { repositoryCloneProtocol } = getPreferenceValues<Preferences.SearchRepositories>();

  const { itemProps, handleSubmit } = useForm<{
    clonePath: string[];
  }>({
    async onSubmit(values) {
      const repoName = pullRequest.repository.name;
      const targetDir = path.join(values.clonePath[0], repoName);
      const branchName = pullRequest.headRef?.name || pullRequest.headRefName;

      if (!branchName) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Branch name not found",
          message: "Unable to determine the branch name for this pull request.",
        });
        return;
      }

      const execAsync = promisify(exec);

      try {
        if (existsSync(targetDir)) {
          await showToast({
            title: `Switching to branch ${branchName}`,
            message: `in ${targetDir}`,
            style: Toast.Style.Animated,
          });

          const { stdout: remoteName } = await execAsync("git remote", { cwd: targetDir });
          const remote = remoteName.trim().split("\n")[0] || "origin";
          await execAsync(`git fetch ${remote} ${branchName}`, { cwd: targetDir });
          await execAsync(`git checkout ${branchName}`, { cwd: targetDir });
          await execAsync(`git reset --hard ${remote}/${branchName}`, { cwd: targetDir });

          await showToast({
            style: Toast.Style.Success,
            title: "Switched to branch successfully",
            message: `Now on ${branchName}`,
          });
        } else {
          await showToast({
            title: `Cloning ${pullRequest.repository.nameWithOwner}`,
            message: `to ${targetDir}`,
            style: Toast.Style.Animated,
          });

          const branchOption = ["-b", branchName];
          const cloneCommand = buildCloneCommand(
            pullRequest.repository.nameWithOwner,
            repositoryCloneProtocol as AcceptableCloneProtocol,
            {
              gitFlags: branchOption,
              targetDir: targetDir,
            },
          );

          await execAsync(cloneCommand);

          await showToast({
            style: Toast.Style.Success,
            title: "Repository cloned successfully",
            message: `Checked out ${branchName}`,
          });
        }

        await open(targetDir);
        await popToRoot();
        await closeMainWindow();
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

        await showFailureToast(error, { title: "Failed checking out pull request" });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Check out PR #${pullRequest.number}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Check out Pull Request" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Repository"
        text={`${pullRequest.repository.nameWithOwner} - ${pullRequest.headRef?.name || pullRequest.headRefName}`}
      />
      <Form.FilePicker
        {...itemProps.clonePath}
        title="Clone Path"
        info="Select the directory where the repository should be cloned. If the repository already exists, it will switch to the PR branch."
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        storeValue
      />
    </Form>
  );
}
