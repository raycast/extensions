import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchProps,
  List,
  closeMainWindow,
  getPreferenceValues,
  Keyboard,
  updateCommandMetadata,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useMemo, useState } from "react";

import { agentInfo } from "./agents.ts";
import {
  AgentFilter,
  AgentRow,
  StatusFilter,
  buildSections,
  filterRows,
  loadAgents,
  projectName,
  sessionLabel,
} from "./orca";

const execFileAsync = promisify(execFile);

/** The manifest subtitle; searching "orca" matches on it, so it has to come back. */
const EXTENSION_NAME = "Orca";

const STATUS_LABELS: Record<StatusFilter, string> = {
  waiting: "Waiting for Input",
  stopped: "Waiting & Finished",
  all: "All Agents",
};

function shortBranch(branch?: string): string | undefined {
  if (!branch) return undefined;
  return branch.replace(/^refs\/heads\//, "");
}

/** "waiting 6m" reads better than a timestamp when the point is how long it has been stuck. */
function waitedFor(since?: number): string | undefined {
  if (!since) return undefined;
  const minutes = Math.floor((Date.now() - since) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24
    ? `${hours}h ${minutes % 60}m`
    : `${Math.floor(hours / 24)}d`;
}

/** The task, the last reply, then the raw screen — in the order you need them. */
function detailMarkdown(row: AgentRow): string {
  const sections: string[] = [];

  if (row.prompt?.trim()) {
    sections.push(`**Task**\n\n${row.prompt.trim()}`);
  }
  if (row.lastAssistantMessage?.trim()) {
    sections.push(`**Last reply**\n\n${row.lastAssistantMessage.trim()}`);
  }
  sections.push(
    row.preview?.trim()
      ? `**Terminal**\n\n\`\`\`\n${row.preview.trim()}\n\`\`\``
      : "_No recent output captured._",
  );

  return sections.join("\n\n---\n\n");
}

function stateTag(row: AgentRow): { value: string; color: Color } | undefined {
  if (row.state === "waiting") return { value: "waiting", color: Color.Red };
  if (row.state === "working") return { value: "working", color: Color.Green };
  if (row.state === "done")
    return { value: "done", color: Color.SecondaryText };
  return undefined;
}

export default function Command(
  props: LaunchProps<{ launchContext?: { status?: StatusFilter } }>,
) {
  const { orcaPath, agentFilter } =
    getPreferenceValues<Preferences.ListAgents>();
  const [showDetail, setShowDetail] = useState(false);
  // The list opens on everything — blocked agents sit on top anyway, so the
  // full picture costs nothing. The dropdown narrows it from there.
  const [status, setStatus] = useState<StatusFilter>(
    props.launchContext?.status ?? "all",
  );

  const { isLoading, data, revalidate } = useCachedPromise(
    (path: string) => loadAgents(path, execFileAsync),
    [orcaPath],
    {
      initialData: [] as AgentRow[],
      keepPreviousData: true,
      failureToastOptions: {
        title: "Could not reach Orca",
        message:
          "Is the Orca app running? Check the CLI path in extension preferences.",
      },
    },
  );

  const rows = useMemo(() => data ?? [], [data]);

  // A blocked agent stays blocked until answered, so the list has to keep looking.
  useEffect(() => {
    const timer = setInterval(() => revalidate(), 5000);
    return () => clearInterval(timer);
  }, [revalidate]);

  // The live count belongs to the background command, which actually keeps it
  // fresh. Restoring the manifest subtitle drops any count an older build left
  // stuck here — and null would not do: it clears the row's subtitle entirely,
  // which also drops it out of a search for "orca".
  useEffect(() => {
    updateCommandMetadata({ subtitle: EXTENSION_NAME });
  }, []);

  const sections = useMemo(
    () => buildSections(filterRows(rows, status, agentFilter as AgentFilter)),
    [rows, status, agentFilter],
  );

  const total = sections.reduce(
    (count, section) => count + section.items.length,
    0,
  );

  async function switchToTerminal(row: AgentRow) {
    try {
      await execFileAsync(orcaPath, [
        "terminal",
        "switch",
        "--terminal",
        row.handle,
        "--json",
      ]);
      await execFileAsync("/usr/bin/open", ["-b", "com.stablyai.orca"]);
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, {
        title: "Could not switch to that terminal",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && total > 0}
      searchBarPlaceholder="Search agents by title, project or branch…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Show"
          value={status}
          onChange={(value) => setStatus(value as StatusFilter)}
        >
          <List.Dropdown.Item
            title={STATUS_LABELS.waiting}
            value="waiting"
            icon={{ source: Icon.CircleFilled, tintColor: Color.Red }}
          />
          <List.Dropdown.Item
            title={STATUS_LABELS.stopped}
            value="stopped"
            icon={Icon.Pause}
          />
          <List.Dropdown.Item
            title={STATUS_LABELS.all}
            value="all"
            icon={Icon.Person}
          />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Dot}
        title={isLoading ? "Asking Orca…" : "Nobody is waiting"}
        description={
          isLoading
            ? undefined
            : `No agent matches "${STATUS_LABELS[status]}". Switch the dropdown to see the rest.`
        }
      />

      {sections.map((section) => (
        <List.Section
          key={section.key}
          title={section.kind === "waiting" ? "Waiting for input" : section.key}
          subtitle={
            section.kind === "waiting"
              ? `${section.items.length} blocked`
              : `${section.items.length} ${section.items.length === 1 ? "terminal" : "terminals"}`
          }
        >
          {section.items.map((row) => {
            const agent = row.agentIdentity;
            const branch = shortBranch(row.branch);
            const tag = stateTag(row);
            const waited =
              row.state === "waiting"
                ? waitedFor(row.stateStartedAt)
                : undefined;

            return (
              <List.Item
                key={row.handle}
                icon={
                  // A blocked agent gets a red question mark whatever it runs:
                  // the point of the row is that it is stuck, not which CLI it is.
                  row.state === "waiting"
                    ? { source: Icon.QuestionMarkCircle, tintColor: Color.Red }
                    : {
                        source: Icon.CircleFilled,
                        tintColor: agentInfo(agent).color,
                      }
                }
                title={sessionLabel(row, section.kind === "waiting")}
                subtitle={showDetail ? undefined : branch}
                keywords={[
                  row.worktreePath,
                  agent ?? "shell",
                  branch ?? "",
                  row.state ?? "",
                  row.title ?? "",
                  row.prompt ?? "",
                ]}
                accessories={
                  showDetail
                    ? undefined
                    : [
                        ...(waited
                          ? [{ text: waited, tooltip: "Waiting for" }]
                          : []),
                        ...(row.orphaned
                          ? [{ tag: { value: "orphaned", color: Color.Red } }]
                          : []),
                        ...(row.connected
                          ? []
                          : [
                              {
                                tag: { value: "detached", color: Color.Yellow },
                              },
                            ]),
                        ...(tag ? [{ tag }] : []),
                        ...(agent
                          ? [
                              {
                                tag: {
                                  value: agent,
                                  color: agentInfo(agent).color,
                                },
                              },
                            ]
                          : []),
                      ]
                }
                detail={
                  <List.Item.Detail
                    markdown={detailMarkdown(row)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.TagList title="State">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={row.state ?? "shell"}
                            color={tag?.color ?? Color.SecondaryText}
                          />
                          {row.connected ? null : (
                            <List.Item.Detail.Metadata.TagList.Item
                              text="detached"
                              color={Color.Yellow}
                            />
                          )}
                          {row.orphaned ? (
                            <List.Item.Detail.Metadata.TagList.Item
                              text="orphaned"
                              color={Color.Red}
                            />
                          ) : null}
                        </List.Item.Detail.Metadata.TagList>
                        {row.toolName ? (
                          <List.Item.Detail.Metadata.Label
                            title="Blocked on"
                            text={row.toolName}
                          />
                        ) : null}
                        {waited ? (
                          <List.Item.Detail.Metadata.Label
                            title="Waiting for"
                            text={waited}
                          />
                        ) : null}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Agent"
                          text={agent ?? "—"}
                          icon={
                            agent
                              ? {
                                  source: Icon.CircleFilled,
                                  tintColor: agentInfo(agent).color,
                                }
                              : undefined
                          }
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Project"
                          text={projectName(row)}
                        />
                        {branch ? (
                          <List.Item.Detail.Metadata.Label
                            title="Branch"
                            text={branch}
                          />
                        ) : null}
                        <List.Item.Detail.Metadata.Label
                          title="Path"
                          text={row.worktreePath}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Host"
                          text={row.executionHostId ?? "local"}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Last output"
                          text={
                            row.lastOutputAt
                              ? new Date(row.lastOutputAt).toLocaleString()
                              : "—"
                          }
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Handle"
                          text={row.handle}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title="Switch to Terminal in Orca"
                        icon={Icon.ArrowRight}
                        onAction={() => switchToTerminal(row)}
                      />
                      <Action
                        title={showDetail ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={() => setShowDetail((shown) => !shown)}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action.CopyToClipboard
                        title="Copy Terminal Handle"
                        content={row.handle}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Worktree Path"
                        content={row.worktreePath}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                      <Action.ShowInFinder path={row.worktreePath} />
                    </ActionPanel.Section>

                    <ActionPanel.Section>
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={() => revalidate()}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
