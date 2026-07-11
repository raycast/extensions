import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { GearsetClient } from "./api";
import { EmptyConfiguration, ErrorView } from "./components/ErrorView";
import { safeJson, stateColor, stateIcon } from "./format";
import { GEARSET_COMPARE_DEPLOY_URL, GEARSET_DEPLOYMENT_HISTORY_URL, gearsetDeploymentUrl } from "./navigation";
import { deploymentHistoryDays, getApiToken, requireApiToken } from "./preferences";
import { DeploymentAuditEntry } from "./types";

type StatusFilter = "all" | DeploymentAuditEntry["Status"];

function displayTitle(deployment: DeploymentAuditEntry): string {
  return deployment.FriendlyName || deployment.Name || deployment.DeploymentId;
}

function deploymentMarkdown(deployment: DeploymentAuditEntry): string {
  const differences = deployment.DeploymentDifferences ?? [];
  const differenceCount = deployment.DeploymentDifferenceCount ?? differences.length;
  const rows = differences.slice(0, 50).map((difference) => {
    const modified = difference.ModifiedOn ? new Date(difference.ModifiedOn).toLocaleString() : "—";
    return `| ${difference.DifferenceType || "—"} | ${difference.ObjectType || "—"} | ${difference.DisplayName || "—"} | ${difference.ModifiedBy || "—"} | ${modified} |`;
  });
  const differenceTable = rows.length
    ? `\n## Deployment differences\n\n| Change | Type | Component | Modified by | Modified |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}${differenceCount > differences.length ? `\n\n_Showing ${differences.length} of ${differenceCount} differences. Open the deployment in Gearset for the full component list._` : ""}`
    : "\n## Deployment differences\n\nNo component differences were returned by the Audit API.";

  return `# ${displayTitle(deployment)}\n\n| Field | Value |\n| --- | --- |\n| Status | ${deployment.Status} |\n| Gearset deployment ID | ${deployment.DeploymentId} |\n| Salesforce deployment ID | ${deployment.SalesforceFinalDeploymentId || "—"} |\n| Date | ${new Date(deployment.Date).toLocaleString()} |\n| Owner | ${deployment.Owner || "—"} |\n| Triggered by | ${deployment.TriggeredBy || "—"} |\n| Deployment type | ${deployment.DeploymentType || "—"} |\n| Source | ${deployment.SourceUsername || "—"} (${deployment.SourceMetadataLocationType || "—"}) |\n| Target | ${deployment.TargetUsername || "—"} (${deployment.TargetMetadataLocationType || "—"}) |\n${differenceTable}`;
}

function isProduction(deployment: DeploymentAuditEntry): boolean {
  return deployment.TargetMetadataLocationType.toLowerCase() === "production";
}

function DeploymentActions({ deployment, revalidate }: { deployment: DeploymentAuditEntry; revalidate: () => void }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open Deployment in Gearset"
        url={gearsetDeploymentUrl(deployment.DeploymentId)}
        icon={Icon.Window}
      />
      <Action.CopyToClipboard title="Copy Gearset Deployment ID" content={deployment.DeploymentId} />
      <Action.OpenInBrowser title="Open Compare & Deploy" url={GEARSET_COMPARE_DEPLOY_URL} icon={Icon.ArrowsContract} />
      <Action.OpenInBrowser
        title="Open Full Deployment History"
        url={GEARSET_DEPLOYMENT_HISTORY_URL}
        icon={Icon.Clock}
      />
      {deployment.SalesforceFinalDeploymentId ? (
        <Action.CopyToClipboard
          title="Copy Salesforce Deployment ID"
          content={deployment.SalesforceFinalDeploymentId}
        />
      ) : null}
      <Action.CopyToClipboard title="Copy Deployment as JSON" content={safeJson(deployment)} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    </ActionPanel>
  );
}

export default function TeamDeployments() {
  const token = getApiToken("audit");
  const days = deploymentHistoryDays();
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1_000);
      const response = await new GearsetClient(requireApiToken("audit")).getTeamDeployments(startDate, endDate);
      return [...(response.Deployments ?? [])].sort(
        (left, right) => new Date(right.Date).getTime() - new Date(left.Date).getTime(),
      );
    },
    [],
    { execute: !!token },
  );
  const [status, setStatus] = useState<StatusFilter>("all");

  if (!token) return <EmptyConfiguration kind="audit-token" />;
  if (error)
    return <ErrorView title="Gearset team deployment history could not load" error={error} onRetry={revalidate} />;

  const deployments = (data ?? []).filter((deployment) => status === "all" || deployment.Status === status);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={deployments.length > 0}
      searchBarPlaceholder="Search deployments, people, source, target, or ID…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by status" value={status} onChange={(value) => setStatus(value as StatusFilter)}>
          <List.Dropdown.Item title="All statuses" value="all" />
          <List.Dropdown.Item title="Successful" value="Successful" />
          <List.Dropdown.Item title="Failed" value="Failed" />
          <List.Dropdown.Item title="Partially successful" value="PartiallySuccessful" />
        </List.Dropdown>
      }
    >
      {deployments.map((deployment) => (
        <List.Item
          key={deployment.DeploymentId}
          icon={{ source: stateIcon(deployment.Status), tintColor: stateColor(deployment.Status) }}
          title={displayTitle(deployment)}
          subtitle={`${deployment.Owner || deployment.TriggeredBy || "Unknown user"} · ${deployment.SourceUsername || "Unknown source"} → ${deployment.TargetUsername || "Unknown target"}`}
          keywords={[
            deployment.Owner,
            deployment.TriggeredBy,
            deployment.SourceUsername,
            deployment.TargetUsername,
            deployment.DeploymentType,
            deployment.DeploymentId,
            deployment.SalesforceFinalDeploymentId ?? "",
            deployment.Name,
          ]}
          accessories={[
            ...(isProduction(deployment) ? [{ tag: { value: "PROD", color: Color.Red } }] : []),
            { tag: { value: deployment.Status, color: stateColor(deployment.Status) } },
            { date: new Date(deployment.Date), tooltip: new Date(deployment.Date).toLocaleString() },
          ]}
          detail={<List.Item.Detail markdown={deploymentMarkdown(deployment)} />}
          actions={<DeploymentActions deployment={deployment} revalidate={revalidate} />}
        />
      ))}
      {!isLoading && deployments.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Team Deployments Found"
          description={`No ${status === "all" ? "" : `${status} `}deployments were returned for the last ${days} days.`}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action.OpenInBrowser title="Open Gearset Deployment History" url={GEARSET_DEPLOYMENT_HISTORY_URL} />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
