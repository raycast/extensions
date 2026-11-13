import { List } from "@raycast/api";

import { formatDuration } from "../agents/format.ts";
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
import { getCodingModelRemain, getIntervalPercent, getWeeklyPercent } from "./parser.ts";
import type { MiniMaxUsage, MiniMaxError } from "./types.ts";

export function formatMiniMaxUsageText(usage: MiniMaxUsage | null, error: MiniMaxError | null): string {
  const fallback = formatErrorOrNoData("MiniMax", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as MiniMaxUsage;

  const mode = getPercentageDisplayMode();
  let text = "MiniMax Usage";

  const codingModel = getCodingModelRemain(u.modelRemains);
  if (codingModel) {
    text += `\n\nCoding Model (${codingModel.model_name}):`;

    const intervalPercent = getIntervalPercent(codingModel);
    if (intervalPercent !== null) {
      text += `\n\n5h Limit (${formatDuration(codingModel.remains_time / 1000)}):`;
      text += `\n${generateAsciiBar(toDisplayPercent(intervalPercent, mode))}`;
      text += `\n${formatPercentDisplay(intervalPercent, mode)}`;
      text += `\nResets In: ${formatDuration(codingModel.remains_time / 1000)}`;
    }

    const weeklyPercent = getWeeklyPercent(codingModel);
    if (weeklyPercent !== null) {
      text += `\n\nWeekly Limit (${formatDuration(codingModel.weekly_remains_time / 1000)}):`;
      text += `\n${generateAsciiBar(toDisplayPercent(weeklyPercent, mode))}`;
      text += `\n${formatPercentDisplay(weeklyPercent, mode)}`;
      text += `\nResets In: ${formatDuration(codingModel.weekly_remains_time / 1000)}`;
    }
  }

  return text;
}

export function renderMiniMaxDetail(usage: MiniMaxUsage | null, error: MiniMaxError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as MiniMaxUsage;

  const codingModel = getCodingModelRemain(u.modelRemains);
  const mode = getPercentageDisplayMode();

  return (
    <List.Item.Detail.Metadata>
      {codingModel && (
        <>
          <List.Item.Detail.Metadata.Label title="Coding Model" text={codingModel.model_name} />

          {(() => {
            const percent = getIntervalPercent(codingModel);
            if (percent === null) return null;
            return (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="5h Limit"
                  text={`${generateAsciiBar(toDisplayPercent(percent, mode))} ${formatPercentDisplay(percent, mode)}`}
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
            if (percent === null) return null;
            return (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Weekly Limit"
                  text={`${generateAsciiBar(toDisplayPercent(percent, mode))} ${formatPercentDisplay(percent, mode)}`}
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

export function getMiniMaxAccessory(
  usage: MiniMaxUsage | null,
  error: MiniMaxError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) {
    return getLoadingAccessory("MiniMax");
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
  if (intervalPercent === null && weeklyPercent === null) {
    return getNoDataAccessory();
  }

  const mode = getPercentageDisplayMode();
  const percent = intervalPercent ?? weeklyPercent ?? 0;
  const parts: string[] = [];
  if (intervalPercent !== null) parts.push(`5h: ${toDisplayPercent(intervalPercent, mode)}%`);
  if (weeklyPercent !== null) parts.push(`Weekly: ${toDisplayPercent(weeklyPercent, mode)}%`);

  return {
    icon: generatePieIcon(percent),
    text: `${toDisplayPercent(percent, mode)}%`,
    tooltip: parts.join(" | "),
  };
}
