import { List } from "@raycast/api";

import { formatPercentDisplay, toDisplayPercent, type PercentageDisplayMode } from "../agents/percentage-display.ts";
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
import type { GeminiUsage, GeminiError } from "./types.ts";

function usageWord(mode: PercentageDisplayMode): string {
  return mode === "used" ? "Used" : "Remaining";
}

export function formatGeminiUsageText(usage: GeminiUsage | null, error: GeminiError | null): string {
  const fallback = formatErrorOrNoData("Gemini", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as GeminiUsage;
  const mode = getPercentageDisplayMode();

  let text = `Gemini Usage`;

  if (u.proModel) {
    text += `\n\nPro Model: ${u.proModel.modelId}`;
    text += `\n${usageWord(mode)}: ${formatPercentDisplay(u.proModel.percentLeft, mode)}`;
    text += `\n${generateAsciiBar(toDisplayPercent(u.proModel.percentLeft, mode))}`;
    text += `\nResets In: ${u.proModel.resetsIn}`;
  } else {
    text += `\n\nPro Model: No quota data`;
  }

  if (u.flashModel) {
    text += `\n\nFlash Model: ${u.flashModel.modelId}`;
    text += `\n${usageWord(mode)}: ${formatPercentDisplay(u.flashModel.percentLeft, mode)}`;
    text += `\n${generateAsciiBar(toDisplayPercent(u.flashModel.percentLeft, mode))}`;
    text += `\nResets In: ${u.flashModel.resetsIn}`;
  } else {
    text += `\n\nFlash Model: No quota data`;
  }

  return text;
}

export function renderGeminiDetail(usage: GeminiUsage | null, error: GeminiError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as GeminiUsage;
  const mode = getPercentageDisplayMode();

  return (
    <List.Item.Detail.Metadata>
      {u.proModel ? (
        <>
          <List.Item.Detail.Metadata.Label title="Pro Model" text={u.proModel.modelId} />
          <List.Item.Detail.Metadata.Label
            title={usageWord(mode)}
            text={`${generateAsciiBar(toDisplayPercent(u.proModel.percentLeft, mode))} ${formatPercentDisplay(u.proModel.percentLeft, mode)}`}
          />
          <List.Item.Detail.Metadata.Label title="Resets In" text={u.proModel.resetsIn} />
        </>
      ) : (
        <List.Item.Detail.Metadata.Label title="Pro Model" text="No quota data" />
      )}

      <List.Item.Detail.Metadata.Separator />

      {u.flashModel ? (
        <>
          <List.Item.Detail.Metadata.Label title="Flash Model" text={u.flashModel.modelId} />
          <List.Item.Detail.Metadata.Label
            title={usageWord(mode)}
            text={`${generateAsciiBar(toDisplayPercent(u.flashModel.percentLeft, mode))} ${formatPercentDisplay(u.flashModel.percentLeft, mode)}`}
          />
          <List.Item.Detail.Metadata.Label title="Resets In" text={u.flashModel.resetsIn} />
        </>
      ) : (
        <List.Item.Detail.Metadata.Label title="Flash Model" text="No quota data" />
      )}
    </List.Item.Detail.Metadata>
  );
}

export function getGeminiAccessory(
  usage: GeminiUsage | null,
  error: GeminiError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Gemini");
  }

  if (error) {
    if (error.type === "not_configured") {
      return { text: "Not Configured", tooltip: error.message };
    }
    if (error.type === "unsupported_auth") {
      return { text: "Unsupported Auth", tooltip: error.message };
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

  const mode = getPercentageDisplayMode();
  if (usage.proModel) {
    const proPercent = usage.proModel.percentLeft;
    const flashDisplay = usage.flashModel ? `${toDisplayPercent(usage.flashModel.percentLeft, mode)}%` : "—%";
    return {
      icon: generatePieIcon(proPercent),
      text: `${toDisplayPercent(proPercent, mode)}%`,
      tooltip: `Pro: ${toDisplayPercent(proPercent, mode)}% | Flash: ${flashDisplay}`,
    };
  }

  if (usage.flashModel) {
    return {
      icon: generatePieIcon(usage.flashModel.percentLeft),
      text: `${toDisplayPercent(usage.flashModel.percentLeft, mode)}%`,
      tooltip: `Flash: ${toDisplayPercent(usage.flashModel.percentLeft, mode)}%`,
    };
  }

  return { text: "—", tooltip: "No quota data available" };
}
