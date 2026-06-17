import { join } from "node:path";
import { useEffect, useRef } from "react";
import { Action, ActionPanel, Form, Toast, getPreferenceValues, open, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useCachedPromise, useCachedState, useForm, usePromise } from "@raycast/utils";
import { addWorktree, findRepos, formatPath, getBranches, getRootDir } from "./helpers";

interface RepoConfig {
  prefix: string;
  startBranch: string;
}

interface FormValues {
  repo: string;
  prefix: string;
  branch: string;
  startBranch: string;
}

function getPath(repo: string, prefix: string, branch: string) {
  return join(repo, "..", prefix ? `${prefix}-${branch}` : branch);
}

export default function Command() {
  const rootDir = getRootDir();
  const { data: repos, isLoading: isLoadingRepos } = useCachedPromise((searchDir) => findRepos(searchDir), [rootDir]);
  const [repoConfig, setRepoConfig] = useCachedState<Record<string, RepoConfig>>("repoConfig", {});
  const submitting = useRef(false);

  const {
    values: { repo, prefix, branch, startBranch },
    setValue,
    itemProps,
    handleSubmit,
  } = useForm<FormValues>({
    initialValues: {
      repo: "",
      prefix: "",
      branch: "",
      startBranch: "main",
    },
    validation: {
      repo: FormValidation.Required,
      branch: FormValidation.Required,
      startBranch: FormValidation.Required,
    },
    async onSubmit({ repo, prefix, branch, startBranch }) {
      if (submitting.current) {
        return;
      }

      submitting.current = true;

      setRepoConfig({ ...repoConfig, [repo]: { prefix, startBranch } });

      const path = getPath(repo, prefix, branch);

      try {
        await showToast({
          title: "Adding worktree...",
          style: Toast.Style.Animated,
        });
        await addWorktree(repo, path, branch, startBranch);
        const editor = getPreferenceValues<ExtensionPreferences>().editorApp;
        if (editor) {
          await open(path, editor.bundleId);
        }
        await popToRoot();
      } catch (err) {
        await showToast({
          title: "Could not add worktree!",
          message: err instanceof Error ? err.message : undefined,
          style: Toast.Style.Failure,
        });
      } finally {
        submitting.current = false;
      }
    },
  });

  const { data: branches, isLoading: isLoadingBranches } = usePromise((repoDir) => getBranches(repoDir), [repo], {
    execute: repo.length > 0,
  });

  useEffect(() => {
    if (repos?.length === 0) {
      showToast({
        title: "No git repos",
        message: "Could not find any git repos to create a worktree for. Try checking your repo dir preference.",
        style: Toast.Style.Failure,
      });
    }
  }, [repos]);

  // Reset the rest of the form when the repo changes
  useEffect(() => {
    setValue("prefix", repoConfig[repo]?.prefix ?? "");
    setValue("startBranch", repoConfig[repo]?.startBranch ?? "");
  }, [repo]);

  // After the branches load, populate the start branch with the last start
  // branch, or main, or master, whichever is available first
  useEffect(() => {
    if (!branches) {
      return;
    }

    const config = repoConfig[repo];
    if (config) {
      setValue("startBranch", config.startBranch);
    } else if (branches.includes("main")) {
      setValue("startBranch", "main");
    } else if (branches.includes("master")) {
      setValue("startBranch", "master");
    } else {
      setValue("startBranch", "");
    }
  }, [branches, isLoadingBranches]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Worktree" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {repo && branch && (
        <Form.Description
          title="Summary"
          text={`A new worktree will be added to ${formatPath(repo)} at ${formatPath(
            getPath(repo, prefix, branch),
          )} with the branch ${branch} off of ${startBranch}`}
        />
      )}
      <Form.Dropdown title="Repo" isLoading={isLoadingRepos} storeValue {...itemProps.repo}>
        {repos?.map((repo) => <Form.Dropdown.Item key={repo} value={repo} title={formatPath(repo)} />)}
      </Form.Dropdown>
      <Form.TextField
        title="Directory Prefix"
        placeholder="Directory prefix shared by all of this repo's new worktrees"
        {...itemProps.prefix}
      />
      <Form.TextField title="New Branch Name" placeholder="Name of the new worktree's branch" {...itemProps.branch} />
      <Form.Dropdown
        title="Starting Branch"
        placeholder="Name of the new branch's starting location"
        isLoading={isLoadingBranches}
        {...itemProps.startBranch}
      >
        {!isLoadingBranches &&
          branches?.map((branch) => <Form.Dropdown.Item key={branch} value={branch} title={branch} />)}
      </Form.Dropdown>
    </Form>
  );
}
