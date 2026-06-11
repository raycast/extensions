import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { useEffect, useState } from "react";
import { openProject } from "../lib/codex";
import { type Project } from "../lib/project-store";
import { errorMessage } from "../lib/utils/error";

const execFileAsync = promisify(execFile);

type RelatedWorktree = {
  path: string;
  branch?: string;
  head?: string;
  detached: boolean;
  bare: boolean;
};

function parseGitWorktrees(stdout: string) {
  const items: RelatedWorktree[] = [];
  let current: Partial<RelatedWorktree> | undefined;

  function flush() {
    if (!current?.path) return;
    items.push({
      path: current.path,
      branch: current.branch,
      head: current.head,
      detached: Boolean(current.detached),
      bare: Boolean(current.bare),
    });
  }

  for (const line of stdout.split(/\r?\n/)) {
    if (!line) {
      flush();
      current = undefined;
      continue;
    }

    const [key, ...rest] = line.split(" ");
    const value = rest.join(" ").trim();

    if (key === "worktree") {
      flush();
      current = { path: value };
      continue;
    }

    if (!current) continue;
    if (key === "branch") current.branch = value.replace("refs/heads/", "");
    if (key === "HEAD") current.head = value;
    if (key === "detached") current.detached = true;
    if (key === "bare") current.bare = true;
  }

  flush();
  return items;
}

async function loadRelatedWorktrees(worktree: string) {
  const { stdout } = await execFileAsync(
    "git",
    ["-C", worktree, "worktree", "list", "--porcelain"],
    {
      maxBuffer: 1024 * 1024,
    },
  );

  return parseGitWorktrees(stdout);
}

export function RelatedWorktreesList({ item }: { item: Project }) {
  const [state, setState] = useState({
    items: [] as RelatedWorktree[],
    loading: true,
    err: undefined as string | undefined,
  });

  useEffect(() => {
    let live = true;

    loadRelatedWorktrees(item.worktree)
      .then((items) => {
        if (!live) return;
        setState({ items, loading: false, err: undefined });
      })
      .catch((error) => {
        if (!live) return;
        setState({ err: errorMessage(error), items: [], loading: false });
      });

    return () => {
      live = false;
    };
  }, [item.worktree]);

  if (state.err) {
    return (
      <List
        isLoading={state.loading}
        searchBarPlaceholder="Search related worktrees..."
        navigationTitle="Related Worktrees"
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Related worktrees unavailable"
          description={state.err}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={state.loading}
      searchBarPlaceholder="Search related worktrees..."
      navigationTitle="Related Worktrees"
    >
      {!state.items.length ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No related worktrees"
          description="This project is not part of a git worktree set."
        />
      ) : null}

      {state.items.map((related) => {
        const isCurrent = related.path === item.worktree;
        const branch = related.detached ? "Detached HEAD" : related.branch;

        return (
          <List.Item
            key={related.path}
            title={path.basename(related.path) || related.path}
            subtitle={related.path}
            accessories={[
              ...(isCurrent ? [{ tag: "Current" }] : []),
              ...(branch ? [{ tag: branch }] : []),
              ...(related.bare ? [{ tag: "Bare" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Codex"
                  icon={Icon.Terminal}
                  onAction={async () => {
                    await openProject(related.path);
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={related.path}
                />
                <Action.ShowInFinder
                  title="Show in Finder"
                  path={related.path}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
