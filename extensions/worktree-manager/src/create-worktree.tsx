import React from "react";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as path from "path";
import { getAllWorktrees, getBranches, createWorktree } from "./lib/git";
import { expandRoots, type Preferences } from "./lib/preferences";

async function fetchRepoRoots(): Promise<{ path: string; name: string }[]> {
  const prefs = getPreferenceValues<Preferences>();
  const roots = expandRoots(prefs.roots ?? "");
  if (roots.length === 0) return [];
  const worktrees = await getAllWorktrees(roots);
  const seen = new Set<string>();
  const repos: { path: string; name: string }[] = [];
  for (const w of worktrees) {
    if (!seen.has(w.repoRoot)) {
      seen.add(w.repoRoot);
      repos.push({ path: w.repoRoot, name: w.repoName });
    }
  }
  return repos.sort((a, b) => a.name.localeCompare(b.name));
}

function getDefaultWorktreePath(prefs: Preferences, repoPath: string, branch: string): string {
  const base = (prefs.defaultWorktreePath ?? "").trim();
  if (!base) return "";
  const repoName = repoPath ? path.basename(repoPath) : "";
  const safeBranch = branch.replace(/[/\\]/g, "-");
  if (repoName && safeBranch) return path.join(base, `${repoName}-${safeBranch}`);
  if (repoName) return path.join(base, repoName);
  return base;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const roots = expandRoots(prefs.roots ?? "");
  const hasRoots = roots.length > 0;
  const {
    data: repos = [],
    isLoading: reposLoading,
    error: reposError,
    revalidate,
  } = useCachedPromise(fetchRepoRoots);
  const [repoPath, setRepoPath] = React.useState<string>("");
  const [branches, setBranches] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!repoPath) {
      setBranches([]);
      return;
    }
    getBranches(repoPath)
      .then(setBranches)
      .catch(() => setBranches([]));
  }, [repoPath]);

  async function handleSubmit(values: { repo: string; branch: string }) {
    if (!values.repo || !values.branch) {
      showToast({
        style: Toast.Style.Failure,
        title: "Select repo and branch",
      });
      return;
    }
    const pathToUse = getDefaultWorktreePath(prefs, values.repo, values.branch);
    if (!pathToUse) {
      showToast({
        style: Toast.Style.Failure,
        title: "Set Default worktree path in Extension Preferences (⌘,)",
      });
      return;
    }
    const result = await createWorktree(values.repo, values.branch, pathToUse);
    if (result.success) {
      showToast({
        style: Toast.Style.Success,
        title: "Worktree created",
        primaryAction: {
          title: "Open in Editor",
          onAction: () => open(pathToUse, prefs.openWith),
        },
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: result.error,
      });
    }
  }

  const repoItems = repos.map((r) => ({
    value: r.path,
    title: `${r.name} (${r.path})`,
  }));
  const branchItems = branches.map((b) => ({ value: b, title: b }));

  if (hasRoots && reposError) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
          </ActionPanel>
        }
      >
        <Form.Description title="Failed to load repositories" text={reposError.message} />
      </Form>
    );
  }
  if (repoItems.length === 0 && !reposLoading) {
    return (
      <Form>
        <Form.Description
          title="No repos"
          text="Set Root path in Extension Preferences (⌘,). Then run Search Worktrees once to discover repos."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={reposLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Worktree" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="repo"
        title="Repository"
        storeValue
        onChange={(value) => setRepoPath(value)}
      >
        {repoItems.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="branch" title="Branch" storeValue key={`branch-${repoPath}`}>
        {branchItems.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
