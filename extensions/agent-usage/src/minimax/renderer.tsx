import { List } from "@raycast/api";
import { MiniMaxUsage, MiniMaxError, MiniMaxModelRemain } from "./types";
import type { Accessory } from "../agents/types";
import { formatDuration } from "../agents/format";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui";

function getCodingModelRemain(remains: MiniMaxModelRemain[]): MiniMaxModelRemain | null {
  return remains.find((r) => r.model_name.startsWith("MiniMax-M")) || remains[0] || null;
}

function getRemainingPercent(remaining: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((remaining / total) * 100);
}

export function formatMiniMaxUsageText(usage: MiniMaxUsage | null, error: MiniMaxError | null): string {
  const fallback = formatErrorOrNoData("MiniMax", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as MiniMaxUsage;

  let text = "MiniMax Usage";

  const codingModel = getCodingModelRemain(u.modelRemains);
  if (codingModel) {
    text += `\n\nCoding Model (${codingModel.model_name}):`;

    if (codingModel.current_interval_total_count > 0) {
      const percent = getRemainingPercent(
        codingModel.current_interval_usage_count,
        codingModel.current_interval_total_count,
      );
      text += `\n\n5h Limit (${formatDuration(codingModel.remains_time / 1000)}):`;
      text += `\n${generateAsciiBar(percent)}`;
      text += `\n${percent}% remaining`;
      text += `\nResets In: ${formatDuration(codingModel.remains_time / 1000)}`;
    }

    if (codingModel.current_weekly_total_count > 0) {
      const percent = getRemainingPercent(
        codingModel.current_weekly_usage_count,
        codingModel.current_weekly_total_count,
      );
      text += `\n\nWeekly Limit (${formatDuration(codingModel.weekly_remains_time / 1000)}):`;
      text += `\n${generateAsciiBar(percent)}`;
      text += `\n${percent}% remaining`;
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

  return (
    <List.Item.Detail.Metadata>
      {codingModel && (
        <>
          <List.Item.Detail.Metadata.Label title="Coding Model" text={codingModel.model_name} />

          {codingModel.current_interval_total_count > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="5h Limit"
                text={`${generateAsciiBar(getRemainingPercent(codingModel.current_interval_usage_count, codingModel.current_interval_total_count))} ${getRemainingPercent(codingModel.current_interval_usage_count, codingModel.current_interval_total_count)}% remaining`}
              />
              <List.Item.Detail.Metadata.Label
                title="Resets In"
                text={formatDuration(codingModel.remains_time / 1000)}
              />
            </>
          )}

          {codingModel.current_weekly_total_count > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Weekly Limit"
                text={`${generateAsciiBar(getRemainingPercent(codingModel.current_weekly_usage_count, codingModel.current_weekly_total_count))} ${getRemainingPercent(codingModel.current_weekly_usage_count, codingModel.current_weekly_total_count)}% remaining`}
              />
              <List.Item.Detail.Metadata.Label
                title="Resets In"
                text={formatDuration(codingModel.weekly_remains_time / 1000)}
              />
            </>
          )}
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

  if (codingModel.current_interval_total_count === 0 && codingModel.current_weekly_total_count === 0) {
    return getNoDataAccessory();
  }

  const percent = getRemainingPercent(
    codingModel.current_interval_usage_count,
    codingModel.current_interval_total_count,
  );

  return {
    icon: generatePieIcon(percent),
    text: `${percent}%`,
    tooltip: `5h: ${percent}% | Weekly: ${getRemainingPercent(codingModel.current_weekly_usage_count, codingModel.current_weekly_total_count)}%`,
  };
}
