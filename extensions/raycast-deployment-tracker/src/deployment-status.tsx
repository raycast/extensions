import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  useNavigation,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Environment, Deployment } from "./types";
import {
  getEnvironments,
  getLatestDeployments,
  getDeploymentsForEnvironment,
  deleteDeployment,
} from "./storage";
import { COLOR_MAP, formatDate, shortRef, timeAgo } from "./utils";
import AddDeployment from "./add-deployment";

export default function DeploymentStatus() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [latestMap, setLatestMap] = useState<Map<string, Deployment>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { push } = useNavigation();

  async function load() {
    setIsLoading(true);
    const [envs, latest] = await Promise.all([
      getEnvironments(),
      getLatestDeployments(),
    ]);
    setEnvironments(envs);
    setLatestMap(latest);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function copyAllAsTable() {
    if (environments.length === 0) return;
    const rows = environments.map((env) => {
      const dep = latestMap.get(env.id);
      const ref = dep ? shortRef(dep.ref) : "—";
      const when = dep ? timeAgo(dep.deployedAt) : "—";
      const by = dep?.deployedBy ?? "—";
      return `| ${env.name} | ${ref} | ${when} | ${by} |`;
    });
    const table = [
      `| Environment | Ref | Deployed | By |`,
      `|---|---|---|---|`,
      ...rows,
    ].join("\n");
    await Clipboard.copy(table);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied table to clipboard",
    });
  }

  if (!isLoading && environments.length === 0) {
    return (
      <List isLoading={false}>
        <List.EmptyView
          icon={Icon.Globe}
          title="No environments yet"
          description="Open 'Manage Environments' to add your first environment, then log a deployment."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Deployment Status"
      isShowingDetail={isShowingDetail}
    >
      {environments.map((env) => {
        const latest = latestMap.get(env.id);
        return (
          <List.Item
            key={env.id}
            icon={{ source: Icon.Circle, tintColor: COLOR_MAP[env.color] }}
            title={env.name}
            subtitle={isShowingDetail ? undefined : env.description}
            accessories={
              isShowingDetail
                ? undefined
                : latest
                  ? [
                      { text: shortRef(latest.ref), tooltip: latest.ref },
                      {
                        text: timeAgo(latest.deployedAt),
                        tooltip: formatDate(latest.deployedAt),
                      },
                    ]
                  : [{ text: "No deployments", icon: Icon.Minus }]
            }
            detail={
              <List.Item.Detail markdown={buildDetailMarkdown(env, latest)} />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Actions">
                  <Action
                    icon={Icon.Plus}
                    title="Add Deployment"
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() =>
                      push(
                        <AddDeployment
                          preselectedEnvId={env.id}
                          onAdded={load}
                        />,
                      )
                    }
                  />
                  <Action
                    icon={Icon.List}
                    title="View History"
                    onAction={() =>
                      push(<EnvironmentHistory env={env} onDelete={load} />)
                    }
                  />
                  <Action
                    icon={Icon.Sidebar}
                    title={isShowingDetail ? "Hide Detail" : "Show Detail"}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => setIsShowingDetail((v) => !v)}
                  />
                </ActionPanel.Section>
                {latest && (
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Ref"
                      content={latest.ref}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Full Details"
                      content={formatDeploymentText(env, latest)}
                    />
                    <Action
                      icon={Icon.CopyClipboard}
                      title="Copy All as Table"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={copyAllAsTable}
                    />
                  </ActionPanel.Section>
                )}
                {!latest && (
                  <ActionPanel.Section title="Copy">
                    <Action
                      icon={Icon.CopyClipboard}
                      title="Copy All as Table"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      onAction={copyAllAsTable}
                    />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section>
                  <Action
                    icon={Icon.ArrowClockwise}
                    title="Refresh"
                    onAction={load}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function buildDetailMarkdown(
  env: Environment,
  dep: Deployment | undefined,
): string {
  if (!dep) {
    return `## ${env.name}\n\n${env.description ? `*${env.description}*\n\n` : ""}*No deployments recorded yet.*`;
  }

  const lines: string[] = [`## ${env.name}`];
  if (env.description) lines.push(`*${env.description}*`);
  lines.push("");
  lines.push(`**Ref:** \`${shortRef(dep.ref)}\``);
  if (dep.ref !== shortRef(dep.ref)) lines.push(`**Full:** \`${dep.ref}\``);
  lines.push(`**Deployed:** ${formatDate(dep.deployedAt)}`);
  if (dep.deployedBy) lines.push(`**By:** ${dep.deployedBy}`);
  if (dep.notes) {
    lines.push("");
    lines.push("---");
    lines.push(`**Notes:**`);
    lines.push(dep.notes);
  }
  return lines.join("\n");
}

function EnvironmentHistory({
  env,
  onDelete,
}: {
  env: Environment;
  onDelete: () => void;
}) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    setDeployments(await getDeploymentsForEnvironment(env.id));
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(dep: Deployment) {
    const confirmed = await confirmAlert({
      title: "Delete Deployment Record",
      message: `Remove "${shortRef(dep.ref)}" from history for ${env.name}?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteDeployment(dep.id);
    await showToast({ style: Toast.Style.Success, title: "Deleted" });
    onDelete();
    load();
  }

  return (
    <List isLoading={isLoading} navigationTitle={`${env.name} — History`}>
      {deployments.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.Clock} title="No deployments logged yet" />
      )}
      {deployments.map((dep, i) => (
        <List.Item
          key={dep.id}
          icon={
            i === 0
              ? { source: Icon.Checkmark, tintColor: Color.Green }
              : Icon.Clock
          }
          title={shortRef(dep.ref)}
          subtitle={dep.ref.length > 8 ? dep.ref : undefined}
          accessories={[
            ...(dep.deployedBy ? [{ text: dep.deployedBy }] : []),
            {
              text: timeAgo(dep.deployedAt),
              tooltip: formatDate(dep.deployedAt),
            },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Ref" content={dep.ref} />
              <Action.CopyToClipboard
                title="Copy Full Details"
                content={formatDeploymentText(env, dep)}
              />
              <ActionPanel.Section>
                <Action
                  icon={Icon.Trash}
                  title="Delete Record"
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleDelete(dep)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function formatDeploymentText(env: Environment, dep: Deployment): string {
  const lines = [
    `Environment: ${env.name}`,
    `Ref: ${dep.ref}`,
    `Deployed at: ${formatDate(dep.deployedAt)}`,
  ];
  if (dep.deployedBy) lines.push(`Deployed by: ${dep.deployedBy}`);
  if (dep.notes) lines.push(`Notes: ${dep.notes}`);
  return lines.join("\n");
}
