import React from "react";
import { List } from "@raycast/api";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
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

  const quotaGroups = getQuotaGroups(u);
  if (quotaGroups.length > 0) {
    appendQuotaGroups(lines, quotaGroups);
    return lines.join("\n");
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
  const quotaGroups = getQuotaGroups(u);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Email" text={u.accountEmail || "Unknown"} />
      <List.Item.Detail.Metadata.Label title="Plan" text={u.accountPlan || "Unknown"} />

      {quotaGroups.length > 0 ? (
        quotaGroups.map((group, groupIndex) => (
          <React.Fragment key={`${group.displayName}-${groupIndex}`}>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title={group.displayName}
              text={formatGroupDescription(group.description) ?? ""}
            />
            {group.buckets.map((bucket, bucketIndex) => (
              <React.Fragment key={`${bucket.bucketId}-${bucket.window}-${bucketIndex}`}>
                <List.Item.Detail.Metadata.Label
                  title={`  ${bucket.displayName}`}
                  text={`${generateAsciiBar(bucket.percentLeft, 10)} ${bucket.percentLeft}% remaining`}
                />
                <List.Item.Detail.Metadata.Label title="  Resets In" text={bucket.resetsIn} />
              </React.Fragment>
            ))}
          </React.Fragment>
        ))
      ) : (
        <>
          <List.Item.Detail.Metadata.Separator />
          {renderModelMetadata("Primary", u.primaryModel)}
          {u.secondaryModel != null && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Secondary Model" text={u.secondaryModel.label} />
              <List.Item.Detail.Metadata.Label
                title="Remaining"
                text={`${generateAsciiBar(u.secondaryModel.percentLeft)} ${u.secondaryModel.percentLeft}% remaining`}
              />
              <List.Item.Detail.Metadata.Label title="Resets In" text={u.secondaryModel.resetsIn} />
            </>
          )}
          {u.tertiaryModel != null && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Tertiary Model" text={u.tertiaryModel.label} />
              <List.Item.Detail.Metadata.Label
                title="Remaining"
                text={`${generateAsciiBar(u.tertiaryModel.percentLeft)} ${u.tertiaryModel.percentLeft}% remaining`}
              />
              <List.Item.Detail.Metadata.Label title="Resets In" text={u.tertiaryModel.resetsIn} />
            </>
          )}
        </>
      )}
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

  const quotaGroups = usage ? getQuotaGroups(usage) : [];

  if (!usage || (!usage.primaryModel && quotaGroups.length === 0)) {
    return getNoDataAccessory();
  }

  let percent = 100;
  let tooltip = "";

  if (quotaGroups.length > 0) {
    const buckets = quotaGroups.flatMap((g) => g.buckets);
    const percents = buckets.map((b) => b.percentLeft);
    if (percents.length > 0) {
      percent = Math.min(...percents);
    }
    tooltip = quotaGroups
      .map((g) => {
        const parts = g.buckets.map((b) => `${b.displayName}: ${b.percentLeft}%`);
        return `${g.displayName} [${parts.join(" | ")}]`;
      })
      .join(" | ");
  } else if (usage.primaryModel) {
    percent = usage.primaryModel.percentLeft;
    const secondary = usage.secondaryModel;
    tooltip = secondary
      ? `${usage.primaryModel.label}: ${usage.primaryModel.percentLeft}% | ${secondary.label}: ${secondary.percentLeft}%`
      : `${usage.primaryModel.label}: ${usage.primaryModel.percentLeft}%`;
  }

  return {
    icon: generatePieIcon(percent),
    text: `${percent}%`,
    tooltip,
  };
}

function renderModelMetadata(labelPrefix: string, model: AntigravityUsage["primaryModel"]): React.ReactNode {
  if (!model) {
    return <List.Item.Detail.Metadata.Label title={labelPrefix} text="No quota data" />;
  }

  return (
    <>
      <List.Item.Detail.Metadata.Label title={`${labelPrefix} Model`} text={model.label} />
      <List.Item.Detail.Metadata.Label
        title="Remaining"
        text={`${generateAsciiBar(model.percentLeft)} ${model.percentLeft}% remaining`}
      />
      <List.Item.Detail.Metadata.Label title="Resets In" text={model.resetsIn} />
    </>
  );
}

function getQuotaGroups(usage: AntigravityUsage): NonNullable<AntigravityUsage["quotaGroups"]> {
  return usage.quotaGroups?.filter((group) => group.buckets.length > 0) ?? [];
}

function formatGroupDescription(description: string | undefined): string | null {
  if (!description) return null;

  const cleaned = description.replace(/^Models within this group:\s*/i, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function appendQuotaGroups(lines: string[], quotaGroups: NonNullable<AntigravityUsage["quotaGroups"]>): void {
  for (const group of quotaGroups) {
    lines.push("");
    lines.push(group.displayName);

    const description = formatGroupDescription(group.description);
    if (description) {
      lines.push(description);
    }

    for (const bucket of group.buckets) {
      lines.push(`${bucket.displayName}: ${bucket.percentLeft}% remaining`);
      lines.push(generateAsciiBar(bucket.percentLeft, 10));
      lines.push(`Resets In: ${bucket.resetsIn}`);
    }
  }
}

function appendModel(lines: string[], title: string, model: AntigravityUsage["primaryModel"]): void {
  if (!model) {
    lines.push(`${title}: No quota data`);
    return;
  }

  lines.push("");
  lines.push(`${title}: ${model.label}`);
  lines.push(`Remaining: ${model.percentLeft}% remaining`);
  lines.push(generateAsciiBar(model.percentLeft));
  lines.push(`Resets In: ${model.resetsIn}`);
}
