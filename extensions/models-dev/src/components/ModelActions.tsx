import { Action, ActionPanel, Icon } from "@raycast/api";
import { Model } from "../lib/types";
import { ModelDetail } from "./ModelDetail";

type ActionPanelChildren = Parameters<typeof ActionPanel>[0]["children"];

interface ModelActionsProps {
  model: Model;
  onAddToComparison?: (model: Model) => void;
  showViewDetails?: boolean;
  primaryAction?: ActionPanelChildren;
  extraActions?: ActionPanelChildren;
}

export function ModelActions({
  model,
  onAddToComparison,
  showViewDetails = true,
  primaryAction,
  extraActions,
}: ModelActionsProps) {
  const modelJson = JSON.stringify(
    {
      id: model.id,
      name: model.name,
      provider: model.providerName,
      capabilities: {
        reasoning: model.reasoning,
        tool_call: model.tool_call,
        structured_output: model.structured_output,
        vision: model.modalities.input.includes("image"),
        audio: model.modalities.input.includes("audio") || model.modalities.output.includes("audio"),
      },
      modalities: model.modalities,
      cost: model.cost,
      limit: model.limit,
      knowledge: model.knowledge,
      open_weights: model.open_weights,
      status: model.status,
    },
    null,
    2,
  );

  return (
    <ActionPanel>
      {primaryAction && <ActionPanel.Section>{primaryAction}</ActionPanel.Section>}
      <ActionPanel.Section>
        {showViewDetails && <Action.Push title="View Details" icon={Icon.Eye} target={<ModelDetail model={model} />} />}
        <Action.CopyToClipboard title="Copy Model ID" content={model.id} shortcut={{ modifiers: ["cmd"], key: "." }} />
        <Action.CopyToClipboard
          title="Copy Provider/Model"
          content={`${model.providerId}/${model.id}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy as JSON" content={modelJson} />
        {model.providerDoc && (
          <Action.OpenInBrowser
            title="Open Provider Docs"
            url={model.providerDoc}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
        )}
        <Action.OpenInBrowser
          title="Open Models.dev in Browser"
          url={`https://models.dev`}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
      </ActionPanel.Section>

      {onAddToComparison && (
        <ActionPanel.Section>
          <Action
            title="Add to Comparison"
            icon={Icon.PlusCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => onAddToComparison(model)}
          />
        </ActionPanel.Section>
      )}

      {extraActions}
    </ActionPanel>
  );
}
