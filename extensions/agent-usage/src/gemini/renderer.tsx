import { List } from "@raycast/api";
import { GeminiUsage, GeminiError } from "./types";
import type { Accessory } from "../agents/types";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
} from "../agents/ui";

export function formatGeminiUsageText(usage: GeminiUsage | null, error: GeminiError | null): string {
  const fallback = formatErrorOrNoData("Gemini", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as GeminiUsage;

  let text = `Gemini Usage\nEmail: ${u.email}\nTier: ${u.tier}`;

  if (u.proModel) {
    text += `\n\nPro Model: ${u.proModel.modelId}`;
    text += `\nRemaining: ${u.proModel.percentLeft}%`;
    text += `\nResets In: ${u.proModel.resetsIn}`;
  } else {
    text += `\n\nPro Model: No quota data`;
  }

  if (u.flashModel) {
    text += `\n\nFlash Model: ${u.flashModel.modelId}`;
    text += `\nRemaining: ${u.flashModel.percentLeft}%`;
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

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Email" text={u.email} />
      <List.Item.Detail.Metadata.Label title="Tier" text={u.tier} />
      <List.Item.Detail.Metadata.Separator />

      {u.proModel ? (
        <>
          <List.Item.Detail.Metadata.Label title="Pro Model" text={u.proModel.modelId} />
          <List.Item.Detail.Metadata.Label title="Remaining" text={`${u.proModel.percentLeft}%`} />
          <List.Item.Detail.Metadata.Label title="Resets In" text={u.proModel.resetsIn} />
        </>
      ) : (
        <List.Item.Detail.Metadata.Label title="Pro Model" text="No quota data" />
      )}

      <List.Item.Detail.Metadata.Separator />

      {u.flashModel ? (
        <>
          <List.Item.Detail.Metadata.Label title="Flash Model" text={u.flashModel.modelId} />
          <List.Item.Detail.Metadata.Label title="Remaining" text={`${u.flashModel.percentLeft}%`} />
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

  if (usage.proModel) {
    const proPercent = usage.proModel.percentLeft;
    const flashPercent = usage.flashModel?.percentLeft ?? "—";
    return {
      icon: generatePieIcon(proPercent),
      text: `${proPercent}%`,
      tooltip: `Pro: ${proPercent}% | Flash: ${flashPercent}%`,
    };
  }

  if (usage.flashModel) {
    return {
      icon: generatePieIcon(usage.flashModel.percentLeft),
      text: `${usage.flashModel.percentLeft}%`,
      tooltip: `Flash: ${usage.flashModel.percentLeft}%`,
    };
  }

  return { text: "—", tooltip: "No quota data available" };
}
