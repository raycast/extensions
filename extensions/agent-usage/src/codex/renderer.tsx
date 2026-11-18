import { List } from "@raycast/api";
import { Fragment } from "react";

import { formatDuration, formatResetTime, parseDate } from "../agents/format.ts";
import { formatPercentDisplay, toDisplayPercent } from "../agents/percentage-display.ts";
import type { Accessory } from "../agents/types.ts";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  getPercentageDisplayMode,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui.tsx";
import { effectiveRemainingPercent } from "./effective-remaining.ts";
import type { CodexUsage, CodexError } from "./types.ts";

export function formatCodexUsageText(usage: CodexUsage | null, error: CodexError | null): string {
  const fallback = formatErrorOrNoData("Codex", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as CodexUsage;

  const mode = getPercentageDisplayMode();
  let text = `Codex Usage\nAccount: ${u.account}`;
  if (u.fiveHourLimit) {
    text += `\n\n5h Limit: ${formatPercentDisplay(u.fiveHourLimit.percentageRemaining, mode)}`;
    text += `\n${generateAsciiBar(toDisplayPercent(u.fiveHourLimit.percentageRemaining, mode))}`;
    text += `\nResets In: ${formatDuration(u.fiveHourLimit.resetsInSeconds)}`;
  }
  if (u.weeklyLimit) {
    text += `\n\nWeekly Limit: ${formatPercentDisplay(u.weeklyLimit.percentageRemaining, mode)}`;
    text += `\n${generateAsciiBar(toDisplayPercent(u.weeklyLimit.percentageRemaining, mode))}`;
    text += `\nResets In: ${formatDuration(u.weeklyLimit.resetsInSeconds)}`;
  }

  if (u.codeReviewLimit) {
    text += `\n\nCode Review Limit: ${formatPercentDisplay(u.codeReviewLimit.percentageRemaining, mode)}`;
    text += `\nResets In: ${formatDuration(u.codeReviewLimit.resetsInSeconds)}`;
  }

  for (const additionalLimit of u.additionalRateLimits ?? []) {
    for (const window of additionalLimit.windows) {
      text += `\n\n${additionalLimitTitle(additionalLimit.name, window.limitWindowSeconds, additionalLimit.windows.length)}: ${formatPercentDisplay(window.percentageRemaining, mode)}`;
      text += `\n${generateAsciiBar(toDisplayPercent(window.percentageRemaining, mode), 10)}`;
      text += `\nResets In: ${formatDuration(window.resetsInSeconds)}`;
    }
  }

  text += `\n\nCredits: ${u.credits.unlimited ? "Unlimited" : u.credits.balance}`;

  if (u.resetCredits) {
    text += `\nLimit Reset Credits: ${formatResetCredits(u.resetCredits.availableCount)}`;
    if (u.resetCredits.expiresAtList.length > 0) {
      text += "\nExpires At:";
      for (const expiresAt of u.resetCredits.expiresAtList) {
        text += `\n- ${formatExpireTime(expiresAt)}`;
      }
    }
    if (u.resetCreditsError) {
      text += `\nReset Credits Error: ${u.resetCreditsError}`;
    }
  }

  return text;
}

export function renderCodexDetail(usage: CodexUsage | null, error: CodexError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as CodexUsage;
  const mode = getPercentageDisplayMode();

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Account" text={u.account} />
      <List.Item.Detail.Metadata.Separator />

      {u.fiveHourLimit && (
        <>
          <List.Item.Detail.Metadata.Label
            title="5h Limit"
            text={`${generateAsciiBar(toDisplayPercent(u.fiveHourLimit.percentageRemaining, mode))} ${formatPercentDisplay(u.fiveHourLimit.percentageRemaining, mode)}`}
          />
          <List.Item.Detail.Metadata.Label title="Resets In" text={formatDuration(u.fiveHourLimit.resetsInSeconds)} />
        </>
      )}

      {u.weeklyLimit && (
        <>
          {u.fiveHourLimit && <List.Item.Detail.Metadata.Separator />}
          <List.Item.Detail.Metadata.Label
            title="Weekly Limit"
            text={`${generateAsciiBar(toDisplayPercent(u.weeklyLimit.percentageRemaining, mode))} ${formatPercentDisplay(u.weeklyLimit.percentageRemaining, mode)}`}
          />
          <List.Item.Detail.Metadata.Label title="Resets In" text={formatDuration(u.weeklyLimit.resetsInSeconds)} />
        </>
      )}

      {u.codeReviewLimit && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Code Review Limit"
            text={formatPercentDisplay(u.codeReviewLimit.percentageRemaining, mode)}
          />
          <List.Item.Detail.Metadata.Label title="Resets In" text={formatDuration(u.codeReviewLimit.resetsInSeconds)} />
        </>
      )}

      {(u.additionalRateLimits ?? []).map((additionalLimit) =>
        additionalLimit.windows.map((window, index) => (
          <Fragment
            key={`${additionalLimit.meteredFeature ?? additionalLimit.name}-${window.limitWindowSeconds}-${index}`}
          >
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title={additionalLimitTitle(
                additionalLimit.name,
                window.limitWindowSeconds,
                additionalLimit.windows.length,
              )}
              text={`${generateAsciiBar(toDisplayPercent(window.percentageRemaining, mode), 10)} ${formatPercentDisplay(window.percentageRemaining, mode)}`}
            />
            <List.Item.Detail.Metadata.Label title="Resets In" text={formatDuration(window.resetsInSeconds)} />
          </Fragment>
        )),
      )}

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Credits" text={u.credits.unlimited ? "Unlimited" : u.credits.balance} />

      {u.resetCredits && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Limit Reset Credits"
            text={formatResetCredits(u.resetCredits.availableCount)}
          />
          {u.resetCredits.expiresAtList.map((expiresAt, index) => (
            <List.Item.Detail.Metadata.Label
              key={`${expiresAt}-${index}`}
              title={`Manual Reset ${index + 1} Expires`}
              text={formatExpireTime(expiresAt)}
            />
          ))}
          {u.resetCreditsError && (
            <List.Item.Detail.Metadata.Label title="Reset Credits Error" text={u.resetCreditsError} />
          )}
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

function formatResetCredits(availableCount: number | null): string {
  return availableCount === null
    ? "Unavailable"
    : `${availableCount} manual reset${availableCount === 1 ? "" : "s"} available`;
}

function formatExpireTime(value: string): string {
  const date = parseDate(value);
  if (!date) return "unknown";

  const absoluteTime = date
    .toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(",", "");
  return `${absoluteTime} (${formatResetTime(value)})`;
}

export function getCodexAccessory(usage: CodexUsage | null, error: CodexError | null, isLoading: boolean): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Codex");
  }

  if (error) {
    if (error.type === "not_configured") {
      return { text: "Not Configured", tooltip: error.message };
    }
    if (error.type === "unauthorized") {
      return { text: "Token Expired", tooltip: error.message };
    }
    if (error.type === "network_error") {
      return { text: "Network Error", tooltip: error.message };
    }
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) {
    return getNoDataAccessory();
  }

  // Surface the binding constraint — the worst rate-limit window — rather than
  // only the 5h window, so an account with an exhausted weekly (or code-review)
  // limit reads red instead of a falsely-healthy green. Credits stay
  // informational (tooltip / detail panel) since subscription plans routinely
  // report a zero balance while remaining fully usable through their windows.
  const mode = getPercentageDisplayMode();
  const remaining = effectiveRemainingPercent(usage);
  const parts = [];
  if (usage.fiveHourLimit) parts.push(`5h: ${toDisplayPercent(usage.fiveHourLimit.percentageRemaining, mode)}%`);
  if (usage.weeklyLimit) parts.push(`Weekly: ${toDisplayPercent(usage.weeklyLimit.percentageRemaining, mode)}%`);
  if (usage.codeReviewLimit) {
    parts.push(`Code Review: ${toDisplayPercent(usage.codeReviewLimit.percentageRemaining, mode)}%`);
  }
  for (const additionalLimit of usage.additionalRateLimits ?? []) {
    const remaining = Math.min(...additionalLimit.windows.map((window) => window.percentageRemaining));
    parts.push(`${additionalLimit.name}: ${toDisplayPercent(remaining, mode)}%`);
  }

  return {
    icon: generatePieIcon(remaining),
    text: `${toDisplayPercent(remaining, mode)}%`,
    tooltip: parts.join(" | ") || "Codex",
  };
}

function additionalLimitTitle(name: string, limitWindowSeconds: number, windowCount: number): string {
  if (limitWindowSeconds === 5 * 60 * 60) return `${name} — 5h Limit`;
  if (limitWindowSeconds === 7 * 24 * 60 * 60) return `${name} — Weekly Limit`;
  if (limitWindowSeconds >= 28 * 24 * 60 * 60 && limitWindowSeconds <= 31 * 24 * 60 * 60) {
    return `${name} — Monthly Limit`;
  }
  if (windowCount === 1) return name;
  return `${name} — ${formatDuration(limitWindowSeconds)} window`;
}
