import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ErrorEmptyView } from "./components/ErrorEmptyView";
import { IssueActions } from "./components/IssueActions";
import { WorkspaceDropdown } from "./components/WorkspaceDropdown";
import { getIssue, listAgentTasks, listRuntimes } from "./lib/api";
import { AGENT_STATUS, TASK_STATUS, actorIcon, webUrl } from "./lib/format";
import { WorkspaceContext, useWorkspace, useWorkspaceContext } from "./lib/hooks";
import type { Agent, AgentTask, Issue, Runtime } from "./lib/types";

const AGENT_STATUS_ORDER = ["working", "blocked", "error", "idle", "offline"];

export default function AgentsAndRuntimes() {
  const { workspaces, workspace, setWorkspaceId, isLoading: workspaceLoading, error } = useWorkspace();
  const { context, isLoading: contextLoading, revalidateAgents } = useWorkspaceContext(workspace);
  const {
    data: runtimes,
    isLoading: runtimesLoading,
    revalidate: revalidateRuntimes,
  } = useCachedPromise(listRuntimes, [workspace?.id ?? ""], { execute: Boolean(workspace) });

  if (error && !workspaces) {
    return (
      <List>
        <ErrorEmptyView error={error} />
      </List>
    );
  }

  const refresh = () => {
    revalidateAgents();
    revalidateRuntimes();
  };
  const agents = [...(context?.agents ?? [])]
    .filter((a) => !a.archived_at)
    .sort((a, b) => AGENT_STATUS_ORDER.indexOf(a.status) - AGENT_STATUS_ORDER.indexOf(b.status));

  return (
    <List
      isLoading={workspaceLoading || contextLoading || runtimesLoading}
      searchBarPlaceholder="Filter agents and runtimes"
      searchBarAccessory={<WorkspaceDropdown workspaces={workspaces} value={workspace} onChange={setWorkspaceId} />}
    >
      {context && (
        <>
          <List.Section title="Agents" subtitle={String(agents.length)}>
            {agents.map((agent) => (
              <AgentItem key={agent.id} agent={agent} runtimes={runtimes} context={context} onRefresh={refresh} />
            ))}
          </List.Section>
          <List.Section title="Runtimes" subtitle={String(runtimes?.length ?? 0)}>
            {runtimes?.map((runtime) => (
              <RuntimeItem key={runtime.id} runtime={runtime} context={context} onRefresh={refresh} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function runtimeName(runtime: Runtime | undefined): string | undefined {
  return runtime ? runtime.custom_name || runtime.name : undefined;
}

function AgentItem(props: { agent: Agent; runtimes?: Runtime[]; context: WorkspaceContext; onRefresh: () => void }) {
  const { agent, runtimes, context, onRefresh } = props;
  const status = AGENT_STATUS[agent.status] ?? AGENT_STATUS.offline;
  const runtime = runtimes?.find((r) => r.id === agent.runtime_id);
  const url = webUrl(context.workspace, "agents", agent.id);

  return (
    <List.Item
      title={agent.name}
      subtitle={agent.model || agent.description}
      icon={actorIcon("agent", agent.id, context)}
      keywords={[agent.description, agent.model ?? "", runtimeName(runtime) ?? ""]}
      accessories={[
        ...(runtime ? [{ icon: Icon.ComputerChip, text: runtimeName(runtime), tooltip: "Runtime" }] : []),
        { tag: { value: status.name, color: status.color } },
      ]}
      actions={
        <ActionPanel title={agent.name}>
          <Action.Push
            title="Show Recent Runs"
            icon={Icon.List}
            target={<AgentRuns agent={agent} context={context} />}
          />
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard
            title="Copy Agent ID"
            content={agent.id}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function RuntimeItem(props: { runtime: Runtime; context: WorkspaceContext; onRefresh: () => void }) {
  const { runtime, context, onRefresh } = props;
  const online = runtime.status === "online";
  const owner = context.members?.find((m) => m.user_id === runtime.owner_id);

  return (
    <List.Item
      title={runtimeName(runtime) ?? runtime.id}
      subtitle={runtime.provider}
      icon={{ source: Icon.ComputerChip, tintColor: online ? Color.Green : Color.SecondaryText }}
      keywords={[runtime.provider, runtime.device_info ?? "", owner?.name ?? ""]}
      accessories={[
        ...(owner ? [{ icon: actorIcon("member", owner.user_id, context), tooltip: `Owner: ${owner.name}` }] : []),
        ...(runtime.last_seen_at ? [{ date: new Date(runtime.last_seen_at), tooltip: "Last seen" }] : []),
        { tag: { value: online ? "Online" : "Offline", color: online ? Color.Green : Color.SecondaryText } },
      ]}
      actions={
        <ActionPanel title={runtimeName(runtime)}>
          <Action.OpenInBrowser url={webUrl(context.workspace, "runtimes", runtime.id)} />
          <Action.CopyToClipboard
            title="Copy Runtime ID"
            content={runtime.id}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

/** An agent's recent tasks, joined with the issues they ran against. */
async function fetchRuns(workspaceId: string, agentId: string) {
  const tasks = await listAgentTasks(workspaceId, agentId);
  const issueIds = [...new Set(tasks.map((t) => t.issue_id).filter(Boolean))];
  const issues = await Promise.all(issueIds.map((id) => getIssue(workspaceId, id).catch(() => undefined)));
  const byId = new Map(issues.filter((i): i is Issue => Boolean(i)).map((i) => [i.id, i]));
  return tasks.map((task) => ({ task, issue: byId.get(task.issue_id) }));
}

function runDuration(task: AgentTask): string | undefined {
  if (!task.started_at) return undefined;
  const end = task.completed_at ? new Date(task.completed_at) : new Date();
  const minutes = Math.round((end.getTime() - new Date(task.started_at).getTime()) / 60000);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function AgentRuns(props: { agent: Agent; context: WorkspaceContext }) {
  const { agent, context } = props;
  const { data, isLoading, revalidate } = useCachedPromise(fetchRuns, [context.workspace.id, agent.id]);

  return (
    <List navigationTitle={`${agent.name} · Recent Runs`} isLoading={isLoading} searchBarPlaceholder="Filter runs">
      {!isLoading && <List.EmptyView title="No runs yet" icon={Icon.Stars} />}
      {data?.map(({ task, issue }) => {
        const status = TASK_STATUS[task.status] ?? TASK_STATUS.queued;
        const duration = runDuration(task);
        return (
          <List.Item
            key={task.id}
            title={issue?.title ?? task.issue_identifier ?? "Unknown issue"}
            subtitle={issue?.identifier ?? task.issue_identifier}
            icon={{ value: status.icon, tooltip: status.name }}
            keywords={[status.name, issue?.identifier ?? ""]}
            accessories={[
              ...(task.error ? [{ icon: { source: Icon.Warning, tintColor: Color.Red }, tooltip: task.error }] : []),
              ...(duration ? [{ text: duration, icon: Icon.Clock, tooltip: "Duration" }] : []),
              { date: new Date(task.created_at), tooltip: `Queued ${new Date(task.created_at).toLocaleString()}` },
            ]}
            actions={
              issue ? (
                <IssueActions issue={issue} context={context} onChange={revalidate} />
              ) : (
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Task ID" content={task.id} />
                </ActionPanel>
              )
            }
          />
        );
      })}
    </List>
  );
}
