import { List } from "@raycast/api";

import { toDisplayPercent, type PercentageDisplayMode } from "../agents/percentage-display.ts";
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
import type { AmpError, AmpFreeUsage, AmpSubscriptionUsage, AmpUsage } from "./types.ts";

function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function formatAmpFreeSummary(ampFree: AmpFreeUsage, mode: PercentageDisplayMode): string {
  const base = `${formatPercent(toDisplayPercent(ampFree.percentRemaining, mode))} ${mode}`;
  return ampFree.resetNote ? `${base} (${ampFree.resetNote})` : base;
}

function formatSubscriptionPools(subscription: AmpSubscriptionUsage, mode: PercentageDisplayMode): string {
  return `Other ${formatPercent(toDisplayPercent(subscription.otherPercentRemaining, mode))}  Orb ${formatPercent(toDisplayPercent(subscription.orbPercentRemaining, mode))}`;
}

function formatSubscriptionSummary(subscription: AmpSubscriptionUsage, mode: PercentageDisplayMode): string {
  const base = `${formatSubscriptionPools(subscription, mode)} ${mode}`;
  return subscription.resetNote ? `${base} (${subscription.resetNote})` : base;
}

export function formatAmpUsageText(usage: AmpUsage | null, error: AmpError | null): string {
  const fallback = formatErrorOrNoData("Amp", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AmpUsage;

  const mode = getPercentageDisplayMode();
  let text = `Amp Usage`;
  if (u.ampFree) {
    text += `\n\nAmp Free: ${formatAmpFreeSummary(u.ampFree, mode)}`;
    text += `\n${generateAsciiBar(toDisplayPercent(u.ampFree.percentRemaining, mode))}`;
  }
  if (u.subscription) {
    text += `\n\n${u.subscription.plan}: ${formatSubscriptionSummary(u.subscription, mode)}`;
    text += `\nOther ${generateAsciiBar(toDisplayPercent(u.subscription.otherPercentRemaining, mode))}`;
    text += `\nOrb ${generateAsciiBar(toDisplayPercent(u.subscription.orbPercentRemaining, mode))}`;
  }
  text += `\n\nIndividual Credits: ${u.individualCredits.unit}${u.individualCredits.remaining.toFixed(2)}`;

  return text;
}

export function renderAmpDetail(usage: AmpUsage | null, error: AmpError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AmpUsage;
  const mode = getPercentageDisplayMode();

  return (
    <List.Item.Detail.Metadata>
      {u.ampFree && (
        <List.Item.Detail.Metadata.Label
          title="Amp Free"
          text={`${generateAsciiBar(toDisplayPercent(u.ampFree.percentRemaining, mode))} ${formatAmpFreeSummary(u.ampFree, mode)}`}
        />
      )}

      {u.subscription && (
        <>
          {u.ampFree && <List.Item.Detail.Metadata.Separator />}
          <List.Item.Detail.Metadata.Label
            title={`${u.subscription.plan} Other Usage`}
            text={`${generateAsciiBar(toDisplayPercent(u.subscription.otherPercentRemaining, mode))} ${formatPercent(toDisplayPercent(u.subscription.otherPercentRemaining, mode))} ${mode}`}
          />
          <List.Item.Detail.Metadata.Label
            title={`${u.subscription.plan} Orb`}
            text={`${generateAsciiBar(toDisplayPercent(u.subscription.orbPercentRemaining, mode))} ${formatPercent(toDisplayPercent(u.subscription.orbPercentRemaining, mode))} ${mode}`}
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

  const mode = getPercentageDisplayMode();
  const tooltipParts: string[] = [];
  if (usage.ampFree) {
    tooltipParts.push(`Amp Free: ${formatAmpFreeSummary(usage.ampFree, mode)}`);
  }
  if (usage.subscription) {
    tooltipParts.push(`${usage.subscription.plan}: ${formatSubscriptionSummary(usage.subscription, mode)}`);
  }
  tooltipParts.push(`Credits: ${usage.individualCredits.unit}${usage.individualCredits.remaining.toFixed(2)}`);

  const percent = effectiveRemainingPercent(usage);
  if (percent === null) {
    return getNoDataAccessory();
  }

  return {
    icon: generatePieIcon(percent),
    text: formatPercent(toDisplayPercent(percent, mode)),
    tooltip: tooltipParts.join(" | "),
  };
}
