import { List } from "@raycast/api";
import { GeminiUsage, GeminiError } from "./types";
import { renderErrorDetail, renderNoDataDetail, getLoadingAccessory, getNoDataAccessory } from "../agents/ui";

export function formatGeminiUsageText(usage: GeminiUsage | null, error: GeminiError | null): string {
  if (error) {
    return `Gemini Usage\nStatus: Error\nType: ${error.type}\nMessage: ${error.message}`;
  }
  if (!usage) {
    return "Gemini Usage\nStatus: No data available";
  }

  let text = `Gemini Usage\nEmail: ${usage.email}\nTier: ${usage.tier}`;

  if (usage.proModel) {
    text += `\n\nPro Model: ${usage.proModel.modelId}`;
    text += `\nRemaining: ${usage.proModel.percentLeft}%`;
    text += `\nResets In: ${usage.proModel.resetsIn}`;
  } else {
    text += `\n\nPro Model: No quota data`;
  }

  if (usage.flashModel) {
    text += `\n\nFlash Model: ${usage.flashModel.modelId}`;
    text += `\nRemaining: ${usage.flashModel.percentLeft}%`;
    text += `\nResets In: ${usage.flashModel.resetsIn}`;
  } else {
    text += `\n\nFlash Model: No quota data`;
  }

  return text;
}

export function renderGeminiDetail(usage: GeminiUsage | null, error: GeminiError | null): React.ReactNode {
  if (error) {
    return renderErrorDetail(error);
  }

  if (!usage) {
    return renderNoDataDetail();
  }

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Email" text={usage.email} />
      <List.Item.Detail.Metadata.Label title="Tier" text={usage.tier} />
      <List.Item.Detail.Metadata.Separator />

      {usage.proModel ? (
        <>
          <List.Item.Detail.Metadata.Label title="Pro Model" text={usage.proModel.modelId} />
          <List.Item.Detail.Metadata.Label title="Remaining" text={`${usage.proModel.percentLeft}%`} />
          <List.Item.Detail.Metadata.Label title="Resets In" text={usage.proModel.resetsIn} />
        </>
      ) : (
        <List.Item.Detail.Metadata.Label title="Pro Model" text="No quota data" />
      )}

      <List.Item.Detail.Metadata.Separator />

      {usage.flashModel ? (
        <>
          <List.Item.Detail.Metadata.Label title="Flash Model" text={usage.flashModel.modelId} />
          <List.Item.Detail.Metadata.Label title="Remaining" text={`${usage.flashModel.percentLeft}%`} />
          <List.Item.Detail.Metadata.Label title="Resets In" text={usage.flashModel.resetsIn} />
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
): { text: string; tooltip?: string } {
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

  // Show Pro model percentage as primary indicator
  if (usage.proModel) {
    const proPercent = usage.proModel.percentLeft;
    const flashPercent = usage.flashModel?.percentLeft ?? "—";
    return {
      text: `${proPercent}%`,
      tooltip: `Pro: ${proPercent}% | Flash: ${flashPercent}%`,
    };
  }

  if (usage.flashModel) {
    return {
      text: `${usage.flashModel.percentLeft}%`,
      tooltip: `Flash: ${usage.flashModel.percentLeft}%`,
    };
  }

  return { text: "—", tooltip: "No quota data available" };
}
