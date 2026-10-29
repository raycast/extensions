import { Color, Icon, LaunchType, MenuBarExtra, launchCommand, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { connectionLabel, connectionPresentation, summarize } from "./lib/format";
import { integrationIcon, integrationLabel } from "./lib/integrations";
import { connectionIssue, recordedHealthAge, statusConnectionTitles } from "./lib/status";
import { activeWorkspaceId, activateWorkspace, listWorkspaces, workspaceSummary } from "./lib/workspaces";
import { loadWorkspaceStatus } from "./lib/workspace-status";

type WorkspaceSummary = ReturnType<typeof workspaceSummary>;

function launch(name: string, workspaceId?: string) {
  return launchCommand({ name, type: LaunchType.UserInitiated, context: { workspaceId } });
}

function StatusMenu({
  profiles,
  activeId,
  reloadProfiles,
}: {
  profiles: WorkspaceSummary[];
  activeId?: string;
  reloadProfiles: () => Promise<unknown>;
}) {
  const {
    data = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (ids: string[]) => Promise.all(ids.map(loadWorkspaceStatus)),
    [profiles.map((profile) => profile.id)],
    { initialData: [], keepPreviousData: false, onError: () => undefined },
  );
  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0];
  const attentionCount = data.reduce((count, item) => count + item.snapshot.needsAttention + item.approvals.length, 0);
  const unavailable =
    Boolean(error) || data.some((item) => item.snapshot.state === "unavailable" || item.approvalsUnavailable);
  const qualifiedTitle = (title: string, workspace: WorkspaceSummary) =>
    profiles.length > 1 ? `${title} (${workspace.name})` : title;
  const connectionTitles = statusConnectionTitles(
    data.flatMap(({ workspace, snapshot, integrations = [] }) =>
      snapshot.repairConnections.slice(0, 4).map((connection) => ({
        id: `${workspace.id}/${connection.address}`,
        workspace: workspace.name,
        title: [
          integrationLabel(connection.integration, new Map(integrations.map((item) => [item.slug, item]))),
          connectionPresentation(connection, snapshot.repairConnections).text,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
    ),
  );
  return (
    <MenuBarExtra
      icon={attentionCount || unavailable ? { source: Icon.Warning, tintColor: Color.Orange } : Icon.Plug}
      title={attentionCount ? String(attentionCount) : undefined}
      tooltip={`Executor · ${profiles.length} workspaces · ${attentionCount} recorded items need attention`}
      isLoading={isLoading}
    >
      {data.map(({ workspace, snapshot, integrations = [], approvals, approvalsUnavailable }) =>
        snapshot.needsAttention || approvals.length || snapshot.state === "unavailable" || approvalsUnavailable ? (
          <MenuBarExtra.Section key={workspace.id} title={`${workspace.name} · Needs Attention`}>
            {snapshot.state === "unavailable" ? (
              <MenuBarExtra.Item
                title={qualifiedTitle("Connection Status Unavailable", workspace)}
                icon={Icon.Warning}
                onAction={() => launch("connections", workspace.id)}
              />
            ) : null}
            {snapshot.repairConnections.slice(0, 4).map((connection) => (
              <MenuBarExtra.Item
                key={`${workspace.id}/${connection.address}`}
                title={connectionTitles.get(`${workspace.id}/${connection.address}`)!}
                subtitle={`${connectionIssue(connection)} · ${recordedHealthAge(connection.lastHealth?.checkedAt)}`}
                tooltip={[
                  `Workspace: ${workspace.name}`,
                  `Connection: ${connectionLabel(connection)}`,
                  connection.owner === "org" ? "Workspace" : "Personal",
                  connection.lastHealth?.detail ?? connection.lastHealth?.reason,
                ]
                  .filter(Boolean)
                  .join("\n")}
                icon={integrationIcon(connection.integration, new Map(integrations.map((item) => [item.slug, item])))}
                onAction={() => launch("connections", workspace.id)}
              />
            ))}
            {snapshot.needsAttention > 4 ? (
              <MenuBarExtra.Item
                title={qualifiedTitle(`View All ${snapshot.needsAttention} Connection Issues`, workspace)}
                onAction={() => launch("connections", workspace.id)}
              />
            ) : null}
            {approvals.slice(0, 3).map((approval, index) => (
              <MenuBarExtra.Item
                key={approval.executionId}
                title={qualifiedTitle(`${index + 1}. ${summarize(approval.title, 38)}`, workspace)}
                icon={Icon.Clock}
                onAction={() => launch("approvals", workspace.id)}
              />
            ))}
            {approvals.length > 0 ? (
              <MenuBarExtra.Item
                title={qualifiedTitle("Review All Approvals", workspace)}
                icon={Icon.Eye}
                onAction={() => launch("approvals", workspace.id)}
              />
            ) : null}
            {approvalsUnavailable ? (
              <MenuBarExtra.Item
                title={qualifiedTitle("Approvals Unavailable", workspace)}
                icon={Icon.Warning}
                onAction={() => launch("approvals", workspace.id)}
              />
            ) : null}
          </MenuBarExtra.Section>
        ) : null,
      )}
      <MenuBarExtra.Section title={active ? `Shortcuts · ${active.name}` : "Shortcuts"}>
        <MenuBarExtra.Item
          title="Search Tools"
          icon={Icon.MagnifyingGlass}
          onAction={() => launch("search-tools", active?.id)}
        />
        <MenuBarExtra.Item title="Saved Tools" icon={Icon.Star} onAction={() => launch("saved-tools", active?.id)} />
        <MenuBarExtra.Submenu title="More Commands" icon={Icon.Ellipsis}>
          <MenuBarExtra.Item
            title="Manage Connections"
            icon={Icon.Plug}
            onAction={() => launch("connections", active?.id)}
          />
          <MenuBarExtra.Item
            title="Manage Policies"
            icon={Icon.Shield}
            onAction={() => launch("policies", active?.id)}
          />
          <MenuBarExtra.Item
            title="Browse Artifacts"
            icon={Icon.AppWindowGrid2x2}
            onAction={() => launch("artifacts", active?.id)}
          />
          <MenuBarExtra.Item
            title="Review Approvals"
            icon={Icon.Eye}
            onAction={() => launch("approvals", active?.id)}
          />
          <MenuBarExtra.Item
            title="Add Connection"
            icon={Icon.Plus}
            onAction={() => launch("add-connection", active?.id)}
          />
          <MenuBarExtra.Item
            title="Add Integration"
            icon={Icon.PlusCircle}
            onAction={() => launch("add-integration", active?.id)}
          />
          <MenuBarExtra.Item title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title="Switch Workspace" icon={Icon.Building}>
          {profiles.map((workspace) => (
            <MenuBarExtra.Item
              key={workspace.id}
              title={workspace.name}
              icon={workspace.id === active?.id ? Icon.CheckCircle : Icon.Building}
              onAction={async () => {
                try {
                  await activateWorkspace(workspace.id);
                  await reloadProfiles();
                } catch (error) {
                  await showFailureToast(error, { title: "Could Not Switch Workspace" });
                }
              }}
            />
          ))}
          <MenuBarExtra.Item title="Manage Workspaces" icon={Icon.Building} onAction={() => launch("workspaces")} />
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Submenu
          title={error ? "Status Unavailable" : "Connection Status"}
          icon={error ? Icon.Warning : Icon.Info}
        >
          {error ? (
            <MenuBarExtra.Item title="Could Not Load Workspaces" />
          ) : (
            data.map(({ workspace, snapshot }) => (
              <MenuBarExtra.Section key={workspace.id} title={workspace.name}>
                {snapshot.state === "unavailable" ? (
                  <MenuBarExtra.Item title="Status Unavailable" />
                ) : (
                  <>
                    <MenuBarExtra.Item title={`${snapshot.reportedHealthy} of ${snapshot.total} Reported Healthy`} />
                    {snapshot.unverified ? <MenuBarExtra.Item title={`${snapshot.unverified} Unknown Health`} /> : null}
                    {snapshot.stale ? <MenuBarExtra.Item title={`${snapshot.stale} Reports Older Than 24h`} /> : null}
                    <MenuBarExtra.Item
                      title="Oldest Check"
                      subtitle={recordedHealthAge(snapshot.oldestCheckedAt).replace(/^Checked /, "")}
                    />
                  </>
                )}
              </MenuBarExtra.Section>
            ))
          )}
          <MenuBarExtra.Item title="Based on Saved Health Reports" />
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={async () => {
            await Promise.all([revalidate(), reloadProfiles()]);
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default function ExecutorStatus() {
  // Profile credentials stay in encrypted storage and memory, never useCachedPromise.
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const [profiles, activeId] = await Promise.all([listWorkspaces(), activeWorkspaceId()]);
    return { profiles: profiles.map(workspaceSummary), activeId };
  });
  if (!data && !error) return <MenuBarExtra icon={Icon.Plug} isLoading={isLoading} tooltip="Executor" />;
  if (!data?.profiles.length)
    return (
      <MenuBarExtra icon={error ? Icon.Warning : Icon.Plug} isLoading={isLoading} tooltip="Executor Workspaces">
        <MenuBarExtra.Item
          title={error ? "Could Not Load Workspaces" : "Add an Executor Workspace"}
          icon={Icon.Building}
          onAction={() => launch("workspaces")}
        />
      </MenuBarExtra>
    );
  return <StatusMenu profiles={data.profiles} activeId={data.activeId} reloadProfiles={revalidate} />;
}
