import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState, type ReactNode } from "react";
import { jumpToAgent, type ListedAgent } from "../lib/agents/load";
import type { AgentStatus } from "../lib/agents/model";
import { STATUS_TITLE } from "../lib/agents/status";
import { loadAllAgents } from "../lib/platform/agents";
import { activateApp } from "../lib/platform/macos";
import { macosPlatform } from "../lib/platform/os";
import { showFailure } from "../lib/platform/report";
import { projectLabel } from "../lib/projects/project";
import { tildify } from "../lib/tabs/applescript";
import { SwitchAction } from "./switch-action";

const ORDER: AgentStatus[] = ["blocked", "done", "working", "idle", "unknown"];

export const STATUS_COLOR: Record<AgentStatus, Color> = {
  blocked: Color.Red,
  done: Color.Blue,
  working: Color.Yellow,
  idle: Color.Green,
  unknown: Color.SecondaryText,
};

/** Refresh while open, so statuses follow the agents. */
const REFRESH_MS = 4000;

const ALL = "all";

/** Every agent, grouped by status, most urgent first. */
export function AgentList() {
  const { data, isLoading, revalidate } = useCachedPromise(() => loadAllAgents(), [], {
    keepPreviousData: true,
    onError: (error) => showFailure(error, "Could not read agents"),
  });
  // The next read starts only after this one ends: a slow app (AppleScript can take seconds) must not pile up reads.
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(revalidate, REFRESH_MS);
    return () => clearTimeout(timer);
  }, [isLoading, revalidate]);
  const [project, setProject] = useState(ALL);
  const agents = data?.agents ?? [];
  const projects = [...new Set(agents.flatMap((a) => (a.project ? [a.project.name] : [])))].sort();
  const shown = project === ALL ? agents : agents.filter((a) => a.project?.name === project);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter agents"
      searchBarAccessory={
        projects.length > 1 ? (
          <List.Dropdown tooltip="Project" onChange={setProject} storeValue>
            <List.Dropdown.Item title="All Projects" value={ALL} />
            {projects.map((name) => (
              <List.Dropdown.Item key={name} title={name} value={name} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={Icon.Stars}
        title="No Agents Running"
        description="Claude Code, Cursor, Codex, herdr and other agents show up here while they run."
      />
      {ORDER.map((status) => {
        const group = shown.filter((a) => a.status === status);
        return (
          group.length > 0 && (
            <List.Section key={status} title={STATUS_TITLE[status]} subtitle={String(group.length)}>
              {group.map((agent) => (
                <AgentItem key={agent.key} agent={agent} onRefresh={revalidate} />
              ))}
            </List.Section>
          )
        );
      })}
      {(data?.failures.length ?? 0) > 0 && (
        <List.Section title="Unavailable">
          {data!.failures.map((f) => (
            <List.Item key={f.source} icon={Icon.Warning} title={f.source} subtitle={f.message} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export function AgentItem({
  id,
  agent,
  onRefresh,
  children,
}: {
  id?: string;
  agent: ListedAgent;
  onRefresh: () => void;
  /** More actions, at the end of the panel. */
  children?: ReactNode;
}) {
  const where = agent.location?.label ?? "Not found";
  const place = agent.project ? projectLabel(agent.project) : agent.cwd ? tildify(agent.cwd) : undefined;
  return (
    <List.Item
      id={id}
      icon={agent.location ? { fileIcon: agent.location.app.path } : Icon.QuestionMarkCircle}
      title={agent.title}
      subtitle={[agent.product, place].filter(Boolean).join(" · ")}
      keywords={[agent.product, where, ...(agent.project ? [agent.project.name] : [])]}
      accessories={[
        ...(agent.statusDetail
          ? [{ tag: { value: agent.statusDetail, color: STATUS_COLOR[agent.status] } }]
          : [{ tag: { value: STATUS_TITLE[agent.status], color: STATUS_COLOR[agent.status] } }]),
        { text: where },
        ...(agent.since ? [{ date: new Date(agent.since), tooltip: "Since" }] : []),
      ]}
      actions={
        <ActionPanel>
          {agent.location && (
            <SwitchAction
              title="Jump to Agent"
              failureTitle={`Could not jump to ${agent.title}`}
              onSwitch={async () => activateApp(await jumpToAgent(agent, macosPlatform, Date.now()))}
            />
          )}
          {agent.resumeCommand && (
            <Action.CopyToClipboard
              title="Copy Resume Command"
              content={agent.resumeCommand}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          )}
          <Action.CopyToClipboard title="Copy Session ID" content={agent.id} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          {children}
        </ActionPanel>
      }
    />
  );
}
