import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

import { Octokit } from "@octokit/rest";
import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

import { ExtendedRepositoryFieldsFragment } from "../generated/graphql";

interface Preferences {
  defaultClonePath: string;
  personalAccessToken?: string;
}

export function CloneForm({ repository }: { repository: ExtendedRepositoryFieldsFragment }) {
  const preferences = getPreferenceValues<Preferences>();
  const [clonePath, setClonePath] = useState(preferences.defaultClonePath || "");
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [customBranch, setCustomBranch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBranches() {
      setIsLoading(true);
      if (!preferences.personalAccessToken) {
        showToast({
          style: Toast.Style.Failure,
          title: "Personal Access Token Required",
          message:
            "If you want to fetch branches, please set your GitHub Personal Access Token in the extension preferences. Otherwise, you can manually enter a branch name.",
          primaryAction: {
            title: "Open Preferences",
            onAction: () => {
              openExtensionPreferences();
            },
          },
        });
        setIsLoading(false);
        return;
      }

      const octokit = new Octokit({
        auth: preferences.personalAccessToken,
        request: {
          fetch: fetch as unknown as typeof globalThis.fetch,
        },
      });

      try {
        const { data } = await octokit.repos.listBranches({
          owner: repository.owner.login,
          repo: repository.name,
        });
        setBranches(data.map((branch) => branch.name));
        setBranch((repository as { defaultBranchRef?: { name: string } }).defaultBranchRef?.name || "main");
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch branches",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchBranches();
  }, [repository, preferences.personalAccessToken]);

  async function handleSubmit(values: { clonePath: string; branch: string; customBranch: string }) {
    const selectedBranch = values.branch === "custom" ? values.customBranch : values.branch;
    const url = `https://github.com/${repository.nameWithOwner}.git`;
    try {
      if (!fs.existsSync(values.clonePath)) {
        fs.mkdirSync(values.clonePath, { recursive: true });
      }

      const cloneDir = path.join(values.clonePath, repository.name);

      execSync(`git clone -b ${selectedBranch} ${url} "${cloneDir}"`);
      showToast({
        style: Toast.Style.Success,
        title: "Repository cloned successfully",
        message: `Cloned ${repository.name} (${selectedBranch}) to ${cloneDir}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to clone repository",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const handleSelectDirectory = async () => {
    try {
      const script = `
        set selectedFolder to choose folder with prompt "Select Clone Directory"
        return POSIX path of selectedFolder
      `;
      const result = execSync(`osascript -e '${script}'`).toString().trim();

      if (result) {
        setClonePath(result);
        await showHUD("Directory selected! Please reopen Raycast.");
      }
    } catch (error) {
      console.error("Error selecting directory:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to select directory. Please reopen Raycast.",
        message: "Please try again",
      });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clone Repository" onSubmit={handleSubmit} />
          <Action title="Select Clone Directory" onAction={handleSelectDirectory} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="clonePath"
        title="Clone Path"
        placeholder="Select or enter clone path"
        value={clonePath}
        onChange={setClonePath}
      />
      <Form.Description text="Use Shift+Command+Return to open it in Finder" />
      <Form.Dropdown id="branch" title="Branch Name" value={branch} onChange={setBranch}>
        {branches.map((b) => (
          <Form.Dropdown.Item key={b} value={b} title={b} />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom Branch" />
      </Form.Dropdown>
      {branch === "custom" && (
        <Form.TextField
          id="customBranch"
          title="Custom Branch Name"
          placeholder="Enter custom branch name"
          value={customBranch}
          onChange={setCustomBranch}
        />
      )}
      <Form.Description text="Please enter the clone destination directory and select the branch to clone" />
      <Form.Separator />
      <Form.Description text={`Repository to clone: ${repository.nameWithOwner}`} />
    </Form>
  );
}
