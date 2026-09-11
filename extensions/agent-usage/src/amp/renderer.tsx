import { List } from "@raycast/api";

import type { Accessory } from "../agents/types.ts";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui.tsx";
import { effectiveRemainingPercent } from "./effective-remaining.ts";
import type { AmpError, AmpFreeUsage, AmpSubscriptionUsage, AmpUsage } from "./types.ts";

function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function formatAmpFreeSummary(ampFree: AmpFreeUsage): string {
  const base = `${formatPercent(ampFree.percentRemaining)} remaining`;
  return ampFree.resetNote ? `${base} (${ampFree.resetNote})` : base;
}

function formatSubscriptionPools(subscription: AmpSubscriptionUsage): string {
  return `Other ${formatPercent(subscription.otherPercentRemaining)}  Orb ${formatPercent(subscription.orbPercentRemaining)}`;
}

function formatSubscriptionSummary(subscription: AmpSubscriptionUsage): string {
  const base = `${formatSubscriptionPools(subscription)} remaining`;
  return subscription.resetNote ? `${base} (${subscription.resetNote})` : base;
}

export function formatAmpUsageText(usage: AmpUsage | null, error: AmpError | null): string {
  const fallback = formatErrorOrNoData("Amp", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AmpUsage;

  let text = `Amp Usage`;
  if (u.ampFree) {
    text += `\n\nAmp Free: ${formatAmpFreeSummary(u.ampFree)}`;
    text += `\n${generateAsciiBar(u.ampFree.percentRemaining)}`;
  }
  if (u.subscription) {
    text += `\n\n${u.subscription.plan}: ${formatSubscriptionSummary(u.subscription)}`;
    text += `\nOther ${generateAsciiBar(u.subscription.otherPercentRemaining)}`;
    text += `\nOrb ${generateAsciiBar(u.subscription.orbPercentRemaining)}`;
  }
  text += `\n\nIndividual Credits: ${u.individualCredits.unit}${u.individualCredits.remaining.toFixed(2)}`;

  return text;
}

export function renderAmpDetail(usage: AmpUsage | null, error: AmpError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AmpUsage;

  return (
    <List.Item.Detail.Metadata>
      {u.ampFree && (
        <List.Item.Detail.Metadata.Label
          title="Amp Free"
          text={`${generateAsciiBar(u.ampFree.percentRemaining)} ${formatAmpFreeSummary(u.ampFree)}`}
        />
      )}

      {u.subscription && (
        <>
          {u.ampFree && <List.Item.Detail.Metadata.Separator />}
          <List.Item.Detail.Metadata.Label
            title={`${u.subscription.plan} Other Usage`}
            text={`${generateAsciiBar(u.subscription.otherPercentRemaining)} ${formatPercent(u.subscription.otherPercentRemaining)} remaining`}
          />
          <List.Item.Detail.Metadata.Label
            title={`${u.subscription.plan} Orb`}
            text={`${generateAsciiBar(u.subscription.orbPercentRemaining)} ${formatPercent(u.subscription.orbPercentRemaining)} remaining`}
          />
          {u.subscription.resetNote && (
            <List.Item.Detail.Metadata.Label title="Renews" text={u.subscription.resetNote} />
          )}
        </>
      )}

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="Individual Credits"
        text={`${u.individualCredits.unit}${u.individualCredits.remaining.toFixed(2)}`}
      />
    </List.Item.Detail.Metadata>
  );
}

export function getAmpAccessory(usage: AmpUsage | null, error: AmpError | null, isLoading: boolean): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Amp");
  }

  if (error) {
    if (error.type === "not_found") {
      return { text: "Not Installed", tooltip: error.message };
    }
    if (error.type === "not_logged_in") {
      return { text: "Not Logged In", tooltip: error.message };
    }
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) {
    return getNoDataAccessory();
  }

  const tooltipParts: string[] = [];
  if (usage.ampFree) {
    tooltipParts.push(`Amp Free: ${formatAmpFreeSummary(usage.ampFree)}`);
  }
  if (usage.subscription) {
    tooltipParts.push(`${usage.subscription.plan}: ${formatSubscriptionSummary(usage.subscription)}`);
  }
  tooltipParts.push(`Credits: ${usage.individualCredits.unit}${usage.individualCredits.remaining.toFixed(2)}`);

  const percent = effectiveRemainingPercent(usage);
  if (percent === null) {
    return getNoDataAccessory();
  }

  return {
    icon: generatePieIcon(percent),
    text: formatPercent(percent),
    tooltip: tooltipParts.join(" | "),
  };
}
