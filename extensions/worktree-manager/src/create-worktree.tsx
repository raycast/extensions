import React from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  Icon,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as path from "path";
import { getAllWorktrees, createWorktreeFromBase, type WorktreeItem } from "./lib/git";
import { expandRoots, type Preferences } from "./lib/preferences";

async function fetchWorktrees(): Promise<WorktreeItem[]> {
  const prefs = getPreferenceValues<Preferences>();
  const roots = expandRoots(prefs.roots ?? "");
  if (roots.length === 0) return [];
  return getAllWorktrees(roots);
}

function formatWorktreeError(fullError: string): { title: string; message: string } {
  const alreadyUsed = fullError.match(/'([^']+)' is already used by worktree at '([^']+)'/);
  if (alreadyUsed) {
    const [, branch, existingPath] = alreadyUsed;
    return {
      title: "Branch already in use",
      message: `"${branch}" is checked out at:\n${existingPath}\n\nUse another branch, or remove that worktree first (e.g. \`git worktree remove\` there).`,
    };
  }
  if (/a branch named .+ already exists/i.test(fullError)) {
    return {
      title: "Branch name already exists",
      message: "A branch with that name already exists. Choose another Worktree Name.",
    };
  }
  if (/already exists|already checked out/i.test(fullError)) {
    return {
      title: "Worktree already exists",
      message:
        "A worktree at that path already exists. Choose another Worktree Name or remove the existing folder first.",
    };
  }
  return { title: "Failed", message: fullError };
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const roots = expandRoots(prefs.roots ?? "");
  const hasRoots = roots.length > 0;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const {
    data: worktrees = [],
    isLoading: worktreesLoading,
    error: worktreesError,
    revalidate,
  } = useCachedPromise(fetchWorktrees);

  async function handleSubmit(values: { base: string; worktreeName: string }) {
    const basePath = (values.base ?? "").trim();
    const worktreeName = (values.worktreeName ?? "").trim();
    if (!basePath) {
      showToast({ style: Toast.Style.Failure, title: "Select a Base worktree" });
      return;
    }
    if (!worktreeName) {
      showToast({ style: Toast.Style.Failure, title: "Enter a Worktree Name" });
      return;
    }
    const baseWorktree = worktrees.find((w) => w.path === basePath);
    if (!baseWorktree) {
      showToast({ style: Toast.Style.Failure, title: "Base worktree not found" });
      return;
    }
    const baseDir = (prefs.defaultWorktreePath ?? "").trim();
    if (!baseDir) {
      showToast({
        style: Toast.Style.Failure,
        title: "Set Default worktree path in Extension Preferences (⌘,)",
      });
      return;
    }
    const pathToUse = path.join(baseDir, worktreeName.trim().replace(/[/\\]/g, "-"));
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating worktree…",
    });
    setIsSubmitting(true);
    try {
      const result = await createWorktreeFromBase(
        baseWorktree.repoRoot,
        worktreeName,
        pathToUse,
        baseWorktree.branch
      );
      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Worktree created";
        toast.primaryAction = {
          title: "Open in Editor",
          onAction: () => open(pathToUse, prefs.openWith),
        };
      } else {
        const fullError = result.error ?? "Unknown error";
        const { title, message } = formatWorktreeError(fullError);
        toast.style = Toast.Style.Failure;
        toast.title = title;
        toast.message = message;
        toast.primaryAction = {
          title: "Copy Full Error",
          onAction: () => Clipboard.copy(fullError),
        };
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const baseItems = worktrees.map((w) => ({
    value: w.path,
    title: `${w.repoName} · ${w.branch}`,
  }));

  if (hasRoots && worktreesError) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
          </ActionPanel>
        }
      >
        <Form.Description title="Failed to load worktrees" text={worktreesError.message} />
      </Form>
    );
  }
  if (baseItems.length === 0 && !worktreesLoading) {
    return (
      <Form>
        <Form.Description
          title="No worktrees found"
          text="Set Root path in Extension Preferences (⌘,). Then run Search Worktrees once to discover worktrees."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={worktreesLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Worktree" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="base" title="Base" storeValue>
        {baseItems.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="worktreeName" title="Worktree Name" placeholder="e.g. my-new-worktree" />
    </Form>
  );
}
