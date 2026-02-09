import { List } from "@raycast/api";
import { renderErrorDetail, renderNoDataDetail, getLoadingAccessory, getNoDataAccessory } from "../agents/ui";
import { AntigravityError, AntigravityUsage } from "./types";

export function formatAntigravityUsageText(usage: AntigravityUsage | null, error: AntigravityError | null): string {
  if (error) {
    return `Antigravity Usage\nStatus: Error\nType: ${error.type}\nMessage: ${error.message}`;
  }

  if (!usage) {
    return "Antigravity Usage\nStatus: No data available";
  }

  const lines: string[] = ["Antigravity Usage"];

  if (usage.accountEmail) {
    lines.push(`Email: ${usage.accountEmail}`);
  }

  if (usage.accountPlan) {
    lines.push(`Plan: ${usage.accountPlan}`);
  }

  appendModel(lines, "Primary", usage.primaryModel);
  appendModel(lines, "Secondary", usage.secondaryModel);
  appendModel(lines, "Tertiary", usage.tertiaryModel);

  return lines.join("\n");
}

export function renderAntigravityDetail(
  usage: AntigravityUsage | null,
  error: AntigravityError | null,
): React.ReactNode {
  if (error) {
    return renderErrorDetail(error);
  }

  if (!usage) {
    return renderNoDataDetail();
  }

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Email" text={usage.accountEmail || "Unknown"} />
      <List.Item.Detail.Metadata.Label title="Plan" text={usage.accountPlan || "Unknown"} />
      <List.Item.Detail.Metadata.Separator />
      {renderModelMetadata("Primary", usage.primaryModel)}
      <List.Item.Detail.Metadata.Separator />
      {renderModelMetadata("Secondary", usage.secondaryModel)}
      <List.Item.Detail.Metadata.Separator />
      {renderModelMetadata("Tertiary", usage.tertiaryModel)}
    </List.Item.Detail.Metadata>
  );
}

export function getAntigravityAccessory(
  usage: AntigravityUsage | null,
  error: AntigravityError | null,
  isLoading: boolean,
): { text: string; tooltip?: string } {
  if (isLoading) {
    return getLoadingAccessory("Antigravity");
  }

  if (error) {
    if (error.type === "not_running") {
      return { text: "Not Running", tooltip: error.message };
    }

    if (error.type === "missing_csrf") {
      return { text: "CSRF Missing", tooltip: error.message };
    }

    if (error.type === "port_detection_failed") {
      return { text: "Port Error", tooltip: error.message };
    }

    if (error.type === "api_error") {
      return { text: "API Error", tooltip: error.message };
    }

    return { text: "Error", tooltip: error.message };
  }

  if (!usage || !usage.primaryModel) {
    return getNoDataAccessory();
  }

  const primary = usage.primaryModel;
  const secondary = usage.secondaryModel;

  return {
    text: `${primary.percentLeft}%`,
    tooltip: secondary
      ? `${primary.label}: ${primary.percentLeft}% | ${secondary.label}: ${secondary.percentLeft}%`
      : `${primary.label}: ${primary.percentLeft}%`,
  };
}

function renderModelMetadata(labelPrefix: string, model: AntigravityUsage["primaryModel"]): React.ReactNode {
  if (!model) {
    return <List.Item.Detail.Metadata.Label title={labelPrefix} text="No quota data" />;
  }

  return (
    <>
      <List.Item.Detail.Metadata.Label title={`${labelPrefix} Model`} text={model.label} />
      <List.Item.Detail.Metadata.Label title={`${labelPrefix} Remaining`} text={`${model.percentLeft}%`} />
      <List.Item.Detail.Metadata.Label title={`${labelPrefix} Resets In`} text={model.resetsIn} />
    </>
  );
}

function appendModel(lines: string[], title: string, model: AntigravityUsage["primaryModel"]): void {
  if (!model) {
    lines.push(`${title}: No quota data`);
    return;
  }

  lines.push("");
  lines.push(`${title}: ${model.label}`);
  lines.push(`Remaining: ${model.percentLeft}%`);
  lines.push(`Resets In: ${model.resetsIn}`);
}
