import { writeFileSync, existsSync } from "fs";
import path from "path";

import { Action, ActionPanel, Form, showToast, Toast, showInFinder } from "@raycast/api";
import { showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { useEffect } from "react";

import { getGitHubClient } from "../api/githubClient";
import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";

type DownloadRepositoryFormProps = {
  repository: ExtendedRepositoryFieldsFragment;
};

export default function DownloadRepositoryForm({ repository }: DownloadRepositoryFormProps) {
  const { octokit, token } = getGitHubClient();

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
    downloadPath: string[];
    branch: string;
  }>({
    async onSubmit(values) {
      const downloadUrl = repository.url + "/archive/refs/heads/" + values.branch + ".zip";

      await showToast({
        title: `Downloading ${repository.nameWithOwner}`,
        style: Toast.Style.Animated,
      });

      try {
        let response: Response;

        if (repository.isPrivate && token) {
          const apiUrl = `https://api.github.com/repos/${repository.owner.login}/${repository.name}/zipball/${values.branch}`;
          response = await fetch(apiUrl, {
            headers: {
              Authorization: `token ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
            redirect: "follow",
          });
        } else {
          response = await fetch(downloadUrl);
        }
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        let fileName = `${repository.name}-${values.branch.replaceAll("/", "-")}.zip`;
        let filePath = path.join(values.downloadPath[0], fileName);

        let counter = 1;
        while (existsSync(filePath)) {
          const nameWithoutExt = `${repository.name}-${values.branch.replaceAll("/", "-")}`;
          fileName = `${nameWithoutExt} (${counter}).zip`;
          filePath = path.join(values.downloadPath[0], fileName);
          counter++;
        }

        writeFileSync(filePath, uint8Array);

        await showToast({
          style: Toast.Style.Success,
          title: "Downloaded repository successfully",
          message: repository.name,
          primaryAction: {
            title: "Show in Finder",
            async onAction() {
              await showInFinder(filePath);
            },
          },
        });
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed downloading repository",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return;
      }
    },
    validation: {
      downloadPath: (value) => {
        if (!value || value.length === 0) {
          return "Please select a download path";
        }
      },
      branch: (value) => {
        if (!value || value.trim() === "") {
          return "Please select a branch";
        }
      },
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
      navigationTitle={`Download ${repository.nameWithOwner}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download Repository" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        {...itemProps.downloadPath}
        title="Download Path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        storeValue
      />
      <Form.Dropdown {...itemProps.branch} title="Branch Name">
        {branches?.map((b) => <Form.Dropdown.Item key={b} value={b} title={b} />)}
      </Form.Dropdown>
    </Form>
  );
}
