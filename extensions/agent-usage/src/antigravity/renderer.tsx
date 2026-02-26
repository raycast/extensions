import { List } from "@raycast/api";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
} from "../agents/ui";
import { AntigravityError, AntigravityUsage } from "./types";
import type { Accessory } from "../agents/types";

export function formatAntigravityUsageText(usage: AntigravityUsage | null, error: AntigravityError | null): string {
  const fallback = formatErrorOrNoData("Antigravity", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AntigravityUsage;

  const lines: string[] = ["Antigravity Usage"];

  if (u.accountEmail) {
    lines.push(`Email: ${u.accountEmail}`);
  }

  if (u.accountPlan) {
    lines.push(`Plan: ${u.accountPlan}`);
  }

  appendModel(lines, "Primary", u.primaryModel);
  appendModel(lines, "Secondary", u.secondaryModel);
  appendModel(lines, "Tertiary", u.tertiaryModel);

  return lines.join("\n");
}

export function renderAntigravityDetail(
  usage: AntigravityUsage | null,
  error: AntigravityError | null,
): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AntigravityUsage;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Email" text={u.accountEmail || "Unknown"} />
      <List.Item.Detail.Metadata.Label title="Plan" text={u.accountPlan || "Unknown"} />
      <List.Item.Detail.Metadata.Separator />
      {renderModelMetadata("Primary", u.primaryModel)}
      <List.Item.Detail.Metadata.Separator />
      {renderModelMetadata("Secondary", u.secondaryModel)}
      <List.Item.Detail.Metadata.Separator />
      {renderModelMetadata("Tertiary", u.tertiaryModel)}
    </List.Item.Detail.Metadata>
  );
}

export function getAntigravityAccessory(
  usage: AntigravityUsage | null,
  error: AntigravityError | null,
  isLoading: boolean,
): Accessory {
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
    icon: generatePieIcon(primary.percentLeft),
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
