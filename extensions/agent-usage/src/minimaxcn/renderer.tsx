import { List } from "@raycast/api";

import { formatDuration } from "../agents/format.ts";
import type { Accessory } from "../agents/types.ts";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui.tsx";
import { getCodingModelRemain, getIntervalPercent, getWeeklyPercent } from "./parser.ts";
import type { MinimaxCNUsage, MinimaxCNError } from "./types.ts";

export function formatMinimaxCNUsageText(usage: MinimaxCNUsage | null, error: MinimaxCNError | null): string {
  const fallback = formatErrorOrNoData("MinimaxCN", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as MinimaxCNUsage;

  let text = "MinimaxCN Usage";

  const codingModel = getCodingModelRemain(u.modelRemains);
  if (codingModel) {
    text += `\n\nCoding Model (${codingModel.model_name}):`;

    const intervalPercent = getIntervalPercent(codingModel);
    // Mirror the renderer rule: keep the row when reset is pending, even if the API
    // stops returning a percentage once the quota is exhausted.
    if (intervalPercent !== null || codingModel.remains_time > 0) {
      const shown = intervalPercent ?? 0;
      text += `\n\n5h Limit (${formatDuration(codingModel.remains_time / 1000)}):`;
      text += `\n${generateAsciiBar(shown)}`;
      text += `\n${shown}% remaining`;
      text += `\nResets In: ${formatDuration(codingModel.remains_time / 1000)}`;
    }

    const weeklyPercent = getWeeklyPercent(codingModel);
    if (weeklyPercent !== null || codingModel.weekly_remains_time > 0) {
      const shown = weeklyPercent ?? 0;
      text += `\n\nWeekly Limit (${formatDuration(codingModel.weekly_remains_time / 1000)}):`;
      text += `\n${generateAsciiBar(shown)}`;
      text += `\n${shown}% remaining`;
      text += `\nResets In: ${formatDuration(codingModel.weekly_remains_time / 1000)}`;
    }
  }

  return text;
}

export function renderMinimaxCNDetail(usage: MinimaxCNUsage | null, error: MinimaxCNError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as MinimaxCNUsage;

  const codingModel = getCodingModelRemain(u.modelRemains);

  return (
    <List.Item.Detail.Metadata>
      {codingModel && (
        <>
          <List.Item.Detail.Metadata.Label title="Coding Model" text={codingModel.model_name} />

          {(() => {
            const percent = getIntervalPercent(codingModel);
            // When the 5h quota is exhausted (total=0, status not active, no remaining_percent),
            // getIntervalPercent returns null. Preserve the row so the user still sees the reset
            // countdown and a 0% placeholder, as long as reset hasn't happened yet.
            if (percent === null && codingModel.remains_time <= 0) return null;
            const shown = percent ?? 0;
            return (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="5h Limit"
                  text={`${generateAsciiBar(shown)} ${shown}% remaining`}
                />
                <List.Item.Detail.Metadata.Label
                  title="Resets In"
                  text={formatDuration(codingModel.remains_time / 1000)}
                />
              </>
            );
          })()}

          {(() => {
            const percent = getWeeklyPercent(codingModel);
            // Same rationale as the 5h block: keep the weekly row visible while reset is pending,
            // even when the API no longer returns a percentage for an exhausted weekly quota.
            if (percent === null && codingModel.weekly_remains_time <= 0) return null;
            const shown = percent ?? 0;
            return (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Weekly Limit"
                  text={`${generateAsciiBar(shown)} ${shown}% remaining`}
                />
                <List.Item.Detail.Metadata.Label
                  title="Resets In"
                  text={formatDuration(codingModel.weekly_remains_time / 1000)}
                />
              </>
            );
          })()}
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

export function getMinimaxCNAccessory(
  usage: MinimaxCNUsage | null,
  error: MinimaxCNError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) {
    return getLoadingAccessory("MinimaxCN");
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

  if (!usage || usage.modelRemains.length === 0) {
    return getNoDataAccessory();
  }

  const codingModel = getCodingModelRemain(usage.modelRemains);
  if (!codingModel) {
    return getNoDataAccessory();
  }

  const intervalPercent = getIntervalPercent(codingModel);
  const weeklyPercent = getWeeklyPercent(codingModel);
  // Mirror the detail-panel rule: when the API no longer returns a percentage for an
  // exhausted quota but reset hasn't arrived, treat it as 0% rather than "no data".
  const shownIntervalPercent = intervalPercent ?? (codingModel.remains_time > 0 ? 0 : null);
  const shownWeeklyPercent = weeklyPercent ?? (codingModel.weekly_remains_time > 0 ? 0 : null);
  if (shownIntervalPercent === null && shownWeeklyPercent === null) {
    return getNoDataAccessory();
  }

  const percent = shownIntervalPercent ?? shownWeeklyPercent ?? 0;
  const parts: string[] = [];
  if (shownIntervalPercent !== null) parts.push(`5h: ${shownIntervalPercent}%`);
  if (shownWeeklyPercent !== null) parts.push(`Weekly: ${shownWeeklyPercent}%`);

  return {
    icon: generatePieIcon(percent),
    text: `${percent}%`,
    tooltip: parts.join(" | "),
  };
}
