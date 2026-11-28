import { useState } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { MissingTokenView } from "./components/missing-token";
import { ServiceList } from "./components/service-list";
import {
  WorkspaceUsage,
  fetchWorkspaceUsage,
  fetchWorkspaces,
  hasApiToken,
  isProjectToken,
  projectUrl,
  workspaceUsageUrl,
} from "./railway";
import { formatPercent, formatUsd, utilizationColor } from "./utils";

export default function Command() {
  return hasApiToken() ? <UsageList /> : <MissingTokenView />;
}

function UsageList() {
  const projectToken = isProjectToken();
  const [workspaceId, setWorkspaceId] = useState<string>();

  const { isLoading: isLoadingWorkspaces, data: workspaces = [] } = useCachedPromise(fetchWorkspaces, [], {
    execute: !projectToken,
  });
  const workspace = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];

  const {
    isLoading: isLoadingUsage,
    data: usage,
    revalidate,
  } = useCachedPromise(fetchWorkspaceUsage, [workspace?.id ?? ""], { execute: Boolean(workspace) });

  if (projectToken) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Usage Needs an Account or Workspace Token"
          description="Project tokens can't read billing information"
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const commonActions = workspace && (
    <>
      <Action.OpenInBrowser
        title="Open Usage in Railway"
        url={workspaceUsageUrl(workspace.id)}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </>
  );

  return (
    <List
      isLoading={isLoadingWorkspaces || isLoadingUsage}
      navigationTitle={workspace ? `Usage · ${workspace.name}` : "Usage"}
      searchBarPlaceholder="Search usage"
      searchBarAccessory={
        workspaces.length > 1 ? (
          <List.Dropdown tooltip="Select Workspace" value={workspace?.id} onChange={setWorkspaceId}>
            {workspaces.map((w) => (
              <List.Dropdown.Item key={w.id} title={w.name} value={w.id} icon={Icon.TwoPeople} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {usage?.workspace.id === workspace?.id && usage && <UsageSections usage={usage} actions={commonActions} />}
    </List>
  );
}

function UsageSections({ usage, actions }: { usage: WorkspaceUsage; actions: React.ReactNode }) {
  const period = `${formatDate(usage.billingPeriod.start)} – ${formatDate(usage.billingPeriod.end)}`;
  const limit = usage.usageLimit;
  const limitPercent = limit?.hardLimit ? (usage.currentUsage / limit.hardLimit) * 100 : undefined;
  const actionPanel = <ActionPanel>{actions}</ActionPanel>;

  return (
    <>
      <List.Section title="Current Billing Period" subtitle={period}>
        <List.Item
          icon={Icon.BankNote}
          title="Current Usage"
          accessories={[{ text: formatUsd(usage.currentUsage) }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Amount" content={formatUsd(usage.currentUsage)} />
              {actions}
            </ActionPanel>
          }
        />
        {usage.estimatedBill !== null && (
          <List.Item
            icon={Icon.LineChart}
            title="Estimated Bill"
            subtitle="Projected for the end of the period"
            accessories={[{ text: formatUsd(usage.estimatedBill) }]}
            actions={actionPanel}
          />
        )}
        {limit && (
          <List.Item
            icon={Icon.Gauge}
            title="Usage Limit"
            subtitle={[
              `Soft ${formatUsd(limit.softLimit)}`,
              limit.hardLimit ? `Hard ${formatUsd(limit.hardLimit)}` : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
            accessories={
              limit.isOverLimit
                ? [{ tag: { value: "Over Limit", color: Color.Red } }]
                : limitPercent !== undefined
                ? [
                    {
                      tag: { value: `${formatPercent(limitPercent)} used`, color: utilizationColor(limitPercent) },
                      tooltip: "Current usage compared to the hard limit",
                    },
                  ]
                : []
            }
            actions={actionPanel}
          />
        )}
      </List.Section>
      <List.Section title="Cost Breakdown">
        {usage.lineItems.map((item) => (
          <List.Item
            key={item.label}
            icon={lineItemIcons[item.label] ?? Icon.Coins}
            title={item.label}
            accessories={[
              { text: share(item.cost, usage.lineItems), tooltip: "Share of this period's usage" },
              { text: formatUsd(item.cost) },
            ]}
            actions={actionPanel}
          />
        ))}
      </List.Section>
      <List.Section title="Projects">
        {usage.projects.map((project) => (
          <List.Item
            key={project.id}
            icon={Icon.Folder}
            title={project.name}
            accessories={[
              ...(project.isDeleted ? [{ tag: { value: "Deleted", color: Color.SecondaryText } }] : []),
              { text: share(project.cost, usage.projects), tooltip: "Share of this period's usage" },
              { text: formatUsd(project.cost) },
            ]}
            actions={
              <ActionPanel>
                {!project.isDeleted && (
                  <>
                    <Action.Push
                      title="Show Services"
                      icon={Icon.AppWindowList}
                      target={<ServiceList project={{ id: project.id, name: project.name }} />}
                    />
                    <Action.OpenInBrowser title="Open Project in Railway" url={projectUrl(project.id)} />
                  </>
                )}
                {actions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </>
  );
}

const lineItemIcons: Record<string, Icon> = {
  CPU: Icon.ComputerChip,
  Memory: Icon.MemoryChip,
  Egress: Icon.Upload,
  Volume: Icon.HardDrive,
  Backup: Icon.Folder,
};

function share(cost: number, items: Array<{ cost: number }>): string {
  const total = items.reduce((sum, item) => sum + item.cost, 0);
  return total > 0 ? formatPercent((cost / total) * 100) : "";
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
