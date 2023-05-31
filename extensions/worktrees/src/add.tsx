import { Action, ActionPanel, Form, Toast, getPreferenceValues, open, popToRoot, showToast } from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { addWorktree, findRepos, formatPath, getBranches, getRootDir } from "./helpers";
import { useEffect, useState } from "react";
import { join } from "node:path";

interface RepoConfig {
  prefix: string;
  startBranch: string;
}

export default function Command() {
  const rootDir = getRootDir();
  const { data: repos, isLoading: isLoadingRepos } = useCachedPromise((searchDir) => findRepos(searchDir), [rootDir]);
  const [repoConfig, setRepoConfig] = useCachedState<Record<string, RepoConfig>>("repoConfig", {});
  const [repo, setRepo] = useState("");
  const [prefix, setPrefix] = useState("");
  const [branch, setBranch] = useState("");
  const [branchError, setBranchError] = useState("");
  const [startBranch, setStartBranch] = useState("main");
  const { data: branches, isLoading: isLoadingBranches } = usePromise((repoDir) => getBranches(repoDir), [repo], {
    execute: repo.length > 0,
  });

  useEffect(() => {
    if (repos?.length === 0) {
      showToast({
        title: "No git repos",
        message: "Could not find any git repos to create a worktree for. Try checking your repo dir setting.",
        style: Toast.Style.Failure,
      });
    }
  }, [repos]);

  // Reset the form when the repo changes
  useEffect(() => {
    setPrefix(repoConfig[repo]?.prefix ?? "");
    setStartBranch(repoConfig[repo]?.startBranch ?? "");
  }, [repo]);

  // After the branches load, populate the start branch with the last start
  // branch, or main, or master, whichever is available first
  useEffect(() => {
    if (!branches) {
      return;
    }

    const config = repoConfig[repo];
    if (config) {
      setStartBranch(config.startBranch);
    } else if (branches.includes("main")) {
      setStartBranch("main");
    } else if (branches.includes("master")) {
      setStartBranch("master");
    } else {
      setStartBranch("");
    }
  }, [branches, isLoadingBranches]);

  const path = repo && branch ? join(repo, "..", prefix ? `${prefix}-${branch}` : branch) : null;

  const handleSubmit = async () => {
    if (!path || !startBranch) {
      return;
    }

    setRepoConfig({ ...repoConfig, [repo]: { prefix, startBranch } });

    try {
      await addWorktree(repo, path, branch, startBranch);
      await open(path, getPreferenceValues<ExtensionPreferences>().editorApp.bundleId);
      await popToRoot();
    } catch (err) {
      await showToast({
        title: "Could not add worktree!",
        message: err instanceof Error ? err.message : undefined,
        style: Toast.Style.Failure,
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Worktree" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {path !== null && (
        <Form.Description
          title="Summary"
          text={`A new worktree will be added to ${formatPath(repo)} at ${formatPath(
            path
          )} with the branch ${branch} off of ${startBranch}`}
        />
      )}
      <Form.Dropdown id="repo" title="Repo" isLoading={isLoadingRepos} value={repo} onChange={setRepo} storeValue>
        {repos?.map((repo) => (
          <Form.Dropdown.Item key={repo} value={repo} title={formatPath(repo)} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="prefix"
        title="Directory Prefix"
        placeholder="Directory prefix shared by all of this repo's new worktrees"
        value={prefix}
        onChange={setPrefix}
      />
      <Form.TextField
        id="branch"
        title="New Branch Name"
        placeholder="Name of the new worktree's branch"
        value={branch}
        onChange={setBranch}
        error={branchError}
        onBlur={() => setBranchError(branch === "" ? "Branch must not be empty" : "")}
      />
      <Form.Dropdown
        id="startBranch"
        title="Starting Branch"
        placeholder="Name of the new branch's starting location"
        isLoading={isLoadingBranches}
        value={startBranch}
        onChange={setStartBranch}
      >
        {!isLoadingBranches &&
          branches?.map((branch) => <Form.Dropdown.Item key={branch} value={branch} title={branch} />)}
      </Form.Dropdown>
    </Form>
  );
}
