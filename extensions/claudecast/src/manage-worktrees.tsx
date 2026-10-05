import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listAgentSessions } from "./lib/agent-control";
import { ensureClaudeInstalled } from "./lib/claude-cli";
import { getAllProjects } from "./lib/project-discovery";
import { launchClaudeCode } from "./lib/terminal";
import {
  discoverManagedWorktrees,
  previewPrunableWorktrees,
  pruneMissingWorktrees,
  runManagedWorktreeAction,
  type ManagedWorktree,
} from "./lib/worktree-control";
import { canRemoveWorktree } from "./lib/worktree-core";
import { shortcut } from "./lib/shortcuts";

type WorktreeSection =
  | "Needs Attention"
  | "Agent Worktrees"
  | "Clean Worktrees"
  | "Main Worktrees";

const SECTION_ORDER: WorktreeSection[] = [
  "Needs Attention",
  "Agent Worktrees",
  "Clean Worktrees",
  "Main Worktrees",
];

export default function ManageWorktrees() {
  const [worktrees, setWorktrees] = useState<ManagedWorktree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshSequence = useRef(0);
  const refreshAbort = useRef<AbortController>();

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    refreshAbort.current?.abort();
    const controller = new AbortController();
    refreshAbort.current = controller;
    setIsLoading(true);
    try {
      const [projects, agents] = await Promise.all([
        getAllProjects(),
        listAgentSessions(false).catch(() => []),
      ]);
      const projectPaths = [
        ...projects.favorites,
        ...projects.recent,
        ...projects.all,
      ]
        .map((project) => project.path)
        .concat(agents.map((agent) => agent.cwd));
      const next = await discoverManagedWorktrees(
        projectPaths,
        agents,
        controller.signal,
      );
      if (sequence === refreshSequence.current) setWorktrees(next);
    } catch (error) {
      if (sequence !== refreshSequence.current || controller.signal.aborted) {
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktree Discovery Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (sequence === refreshSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => refreshAbort.current?.abort();
  }, [refresh]);

  const sections = useMemo(() => {
    const grouped = new Map<WorktreeSection, ManagedWorktree[]>();
    for (const section of SECTION_ORDER) grouped.set(section, []);
    for (const worktree of worktrees) {
      grouped.get(sectionForWorktree(worktree))!.push(worktree);
    }
    return grouped;
  }, [worktrees]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Worktrees, Branches, and Repositories"
    >
      {worktrees.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Git Worktrees Found"
          description="Open a Git Project with Claude Code, Then Refresh This List"
          icon={Icon.Tree}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Worktrees"
                icon={Icon.ArrowClockwise}
                shortcut={shortcut.refresh}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {SECTION_ORDER.map((section) => {
        const items = sections.get(section) ?? [];
        if (items.length === 0) return null;
        return (
          <List.Section
            key={section}
            title={section}
            subtitle={`${items.length}`}
          >
            {items.map((worktree) => (
              <WorktreeItem
                key={`${worktree.repositoryRoot}:${worktree.record.path}`}
                worktree={worktree}
                refresh={refresh}
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function WorktreeItem({
  worktree,
  refresh,
}: {
  worktree: ManagedWorktree;
  refresh: () => Promise<void>;
}) {
  const { record, status } = worktree;
  const removal = canRemoveWorktree(record, status);
  const title = compactWorktreeTitle(worktree);
  const statusLabel = worktreeStatusLabel(worktree);
  const accessories: List.Item.Accessory[] = [
    {
      tag: { value: worktree.repositoryName, color: Color.Blue },
    },
    {
      tag: {
        value: statusLabel,
        color:
          record.prunable || status?.conflicted
            ? Color.Red
            : record.locked || (status && !status.isClean)
              ? Color.Orange
              : Color.Green,
      },
    },
  ];
  if (record.isMain) {
    accessories.push({ tag: { value: "Main", color: Color.Purple } });
  } else if (record.detached) {
    accessories.push({
      tag: { value: "Detached", color: Color.SecondaryText },
    });
  } else {
    accessories.push({ tag: { value: "Linked", color: Color.SecondaryText } });
  }
  if (worktree.agents.length > 0) {
    accessories.push({
      tag: {
        value: `${worktree.agents.length} Agent${worktree.agents.length === 1 ? "" : "s"}`,
        color: Color.Orange,
      },
    });
  }
  if (worktree.lastActivity) accessories.push({ date: worktree.lastActivity });

  async function launch() {
    if (!(await ensureClaudeInstalled())) return;
    if (!worktree.pathExists) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktree Path Is Missing",
        message: record.path,
      });
      return;
    }
    await launchClaudeCode({ projectPath: record.path });
    await popToRoot();
  }

  async function toggleLock() {
    const action = record.locked ? "unlock" : "lock";
    try {
      await runManagedWorktreeAction(
        worktree.repositoryRoot,
        action,
        record.path,
        action === "lock" ? "Locked by ClaudeCast" : undefined,
      );
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: record.locked ? "Worktree Unlocked" : "Worktree Locked",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktree Lock Update Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function remove() {
    if (!removal.allowed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktree Cannot Be Removed",
        message: removal.reason,
      });
      return;
    }
    const confirmed = await confirmAlert({
      title: "Remove Worktree",
      message: `Remove ${record.path}? The Git branch will remain.`,
      primaryAction: {
        title: "Remove Worktree",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await runManagedWorktreeAction(
        worktree.repositoryRoot,
        "remove",
        record.path,
      );
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "Worktree Removed",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktree Removal Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function prune() {
    try {
      const preview = (
        await previewPrunableWorktrees(worktree.repositoryRoot)
      ).trim();
      if (!preview) {
        await showToast({
          style: Toast.Style.Success,
          title: "No Missing Worktrees to Prune",
        });
        return;
      }
      if (preview.length > 2_000) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Prune Preview Is Too Large",
          message: "Run Git Worktree Prune in a Terminal to Review Every Entry",
        });
        return;
      }
      const confirmed = await confirmAlert({
        title: "Prune Missing Worktrees",
        message: preview.slice(0, 2_000),
        primaryAction: {
          title: "Prune Worktrees",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
      await pruneMissingWorktrees(worktree.repositoryRoot, preview);
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "Missing Worktrees Pruned",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktree Prune Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List.Item
      title={title}
      subtitle={record.path}
      icon={
        record.prunable
          ? { source: Icon.Warning, tintColor: Color.Red }
          : worktree.agents.length > 0
            ? { source: Icon.Person, tintColor: Color.Orange }
            : record.isMain
              ? Icon.House
              : Icon.Tree
      }
      keywords={[
        worktree.repositoryName,
        record.branch || "",
        record.path,
        ...worktree.agents.map((agent) => agent.name || agent.id || ""),
      ]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Worktree">
            <Action.Push
              title="View Worktree Details"
              icon={Icon.Eye}
              target={<WorktreeDetail worktree={worktree} />}
            />
            {!record.prunable && !record.bare ? (
              <Action
                title="Launch Claude in Worktree"
                icon={Icon.Terminal}
                onAction={launch}
              />
            ) : null}
            {worktree.pathExists ? (
              <Action.ShowInFinder
                title="Show Worktree in File Browser"
                path={record.path}
              />
            ) : null}
            {!record.isMain && !record.prunable && !record.bare ? (
              <Action
                title={record.locked ? "Unlock Worktree" : "Lock Worktree"}
                icon={record.locked ? Icon.LockUnlocked : Icon.Lock}
                onAction={toggleLock}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Maintenance">
            {record.prunable ? (
              <Action
                title="Prune Missing Worktrees"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={prune}
              />
            ) : null}
            {!record.isMain && !record.prunable && !record.bare ? (
              <Action
                title="Remove Clean Worktree"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={remove}
              />
            ) : null}
            <Action
              title="Refresh Worktrees"
              icon={Icon.ArrowClockwise}
              shortcut={shortcut.refresh}
              onAction={refresh}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Worktree Path"
              content={record.path}
            />
            {record.branch ? (
              <Action.CopyToClipboard
                title="Copy Branch Name"
                content={record.branch}
              />
            ) : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function compactWorktreeTitle(worktree: ManagedWorktree): string {
  const { record } = worktree;
  const raw = record.branch
    ? record.branch.split("/").slice(-2).join("/")
    : record.detached
      ? `Detached · ${record.path.split(/[\\/]/).pop() || "Worktree"}`
      : record.path.split(/[\\/]/).pop() || "Worktree";
  if (raw.length <= 34) return raw;
  return `${raw.slice(0, 20)}…${raw.slice(-11)}`;
}

function WorktreeDetail({ worktree }: { worktree: ManagedWorktree }) {
  const { record, status } = worktree;

  async function launch() {
    try {
      if (!(await ensureClaudeInstalled())) return;
      if (!worktree.pathExists) throw new Error("Worktree Path Is Missing");
      await launchClaudeCode({ projectPath: record.path });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Worktree Could Not Be Launched",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Detail
      navigationTitle="Worktree Details"
      markdown={worktreeMarkdown(worktree)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Repository"
            text={worktree.repositoryName}
          />
          <Detail.Metadata.Label
            title="Branch"
            text={record.branch || "Detached HEAD"}
          />
          <Detail.Metadata.Label
            title="State"
            text={worktreeStatusLabel(worktree)}
          />
          <Detail.Metadata.Label
            title="HEAD"
            text={record.head?.slice(0, 12) || "Unknown"}
          />
          {worktree.agents.length > 0 ? (
            <Detail.Metadata.TagList title="Claude Agents">
              {worktree.agents.map((agent) => (
                <Detail.Metadata.TagList.Item
                  key={
                    agent.id ||
                    agent.sessionId ||
                    `${agent.cwd}:${agent.startedAt}`
                  }
                  text={agent.name || agent.id || "Claude Agent"}
                  color={Color.Orange}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          {status && !status.isClean ? (
            <Detail.Metadata.Label
              title="Changed Paths"
              text={`${status.paths.length}`}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!record.prunable && !record.bare ? (
            <Action
              title="Launch Claude in Worktree"
              icon={Icon.Terminal}
              onAction={launch}
            />
          ) : null}
          {worktree.pathExists ? (
            <Action.ShowInFinder
              title="Show Worktree in File Browser"
              path={record.path}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Worktree Path"
            content={record.path}
          />
        </ActionPanel>
      }
    />
  );
}

function sectionForWorktree(worktree: ManagedWorktree): WorktreeSection {
  if (
    worktree.record.prunable ||
    worktree.record.locked ||
    (worktree.status && !worktree.status.isClean)
  ) {
    return "Needs Attention";
  }
  if (worktree.agents.length > 0) return "Agent Worktrees";
  if (worktree.record.isMain) return "Main Worktrees";
  return "Clean Worktrees";
}

function worktreeStatusLabel(worktree: ManagedWorktree): string {
  const { record, status } = worktree;
  if (record.prunable) return "Missing";
  if (record.locked) return "Locked";
  if (!status) return record.bare ? "Bare" : "Status Unavailable";
  if (status.isClean) return "Clean";
  const changes = status.staged + status.modified + status.untracked;
  return `${changes} Change${changes === 1 ? "" : "s"}`;
}

function worktreeMarkdown(worktree: ManagedWorktree): string {
  const { record, status } = worktree;
  let markdown = `# ${escapeMarkdown(record.branch || "Detached HEAD")}\n\n`;
  markdown += `**Repository:** ${escapeMarkdown(worktree.repositoryName)}\n\n`;
  markdown += `**Path:** \`${escapeCode(record.path)}\`\n\n`;
  markdown += `**HEAD:** \`${escapeCode(record.head?.slice(0, 12) || "Unknown")}\`\n\n`;
  markdown += `**State:** ${worktreeStatusLabel(worktree)}\n\n`;
  if (worktree.lastActivity) {
    markdown += `**Last Activity:** ${worktree.lastActivity.toLocaleString()}\n\n`;
  }
  if (record.lockReason) {
    markdown += `**Lock Reason:** ${escapeMarkdown(record.lockReason)}\n\n`;
  }
  if (record.pruneReason) {
    markdown += `**Prune Reason:** ${escapeMarkdown(record.pruneReason)}\n\n`;
  }
  if (status && !status.isClean) {
    markdown += "## Changes\n\n";
    markdown += `| Staged | Modified | Untracked | Conflicted |\n|------:|---------:|----------:|-----------:|\n| ${status.staged} | ${status.modified} | ${status.untracked} | ${status.conflicted} |\n\n`;
  }
  if (worktree.diffSummary) {
    markdown += `## Diff Summary\n\n\`\`\`text\n${escapeCodeBlock(worktree.diffSummary)}\n\`\`\`\n\n`;
  }
  if (worktree.agents.length > 0) {
    markdown += "## Claude Agents\n\n";
    for (const agent of worktree.agents) {
      markdown += `- ${escapeMarkdown(agent.name || agent.id || "Claude Agent")}: ${escapeMarkdown(agent.state)}\n`;
    }
  }
  return markdown;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|>-]/g, "\\$&");
}

function escapeCode(value: string): string {
  return value.replace(/`/g, "\\`");
}

function escapeCodeBlock(value: string): string {
  return value.replace(/```/g, "` ` `");
}
