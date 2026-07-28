import { List } from "@raycast/api";
import { AmpUsage, AmpError } from "./types";
import type { Accessory } from "../agents/types";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui";

function formatPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function formatAmpFreeSummary(ampFree: AmpUsage["ampFree"]): string {
  const base = `${formatPercent(ampFree.percentRemaining)} remaining`;
  return ampFree.resetNote ? `${base} (${ampFree.resetNote})` : base;
}

export function formatAmpUsageText(usage: AmpUsage | null, error: AmpError | null): string {
  const fallback = formatErrorOrNoData("Amp", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AmpUsage;

  const { ampFree, individualCredits } = u;

  let text = `Amp Usage`;
  text += `\n\nAmp Free: ${formatAmpFreeSummary(ampFree)}`;
  text += `\n${generateAsciiBar(ampFree.percentRemaining)}`;
  text += `\n\nIndividual Credits: ${individualCredits.unit}${individualCredits.remaining.toFixed(2)}`;

  return text;
}

export function renderAmpDetail(usage: AmpUsage | null, error: AmpError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AmpUsage;

  const { ampFree, individualCredits } = u;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Amp Free"
        text={`${generateAsciiBar(ampFree.percentRemaining)} ${formatAmpFreeSummary(ampFree)}`}
      />

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="Individual Credits"
        text={`${individualCredits.unit}${individualCredits.remaining.toFixed(2)}`}
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

  const percent = usage.ampFree.percentRemaining;
  const summary = formatAmpFreeSummary(usage.ampFree);

  return {
    icon: generatePieIcon(percent),
    text: formatPercent(percent),
    tooltip: `Amp Free: ${summary}`,
  };
}
