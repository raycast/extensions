import { Action, ActionPanel, Icon, Clipboard, useNavigation } from "@raycast/api";
import { memo, useCallback } from "react";
import { Model } from "../lib/types";
import { ModelDetail } from "./ModelDetail";

type ActionPanelChildren = Parameters<typeof ActionPanel>[0]["children"];

interface ModelActionsProps {
  model: Model;
  onAddToComparison?: (model: Model) => void;
  canAddToComparison?: boolean;
  showViewDetails?: boolean;
  primaryAction?: ActionPanelChildren;
  extraActions?: ActionPanelChildren;
}

export const ModelActions = memo(function ModelActions({
  model,
  onAddToComparison,
  canAddToComparison,
  showViewDetails = true,
  primaryAction,
  extraActions,
}: ModelActionsProps) {
  const { push } = useNavigation();

  const handleViewDetails = useCallback(() => {
    push(<ModelDetail model={model} />);
  }, [push, model]);

  const handleCopyJson = useCallback(async () => {
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
    Clipboard.copy(modelJson);
    const { showHUD } = await import("@raycast/api");
    await showHUD("Copied to Clipboard");
  }, [
    model.id,
    model.name,
    model.providerName,
    model.reasoning,
    model.tool_call,
    model.structured_output,
    model.modalities,
    model.cost,
    model.limit,
    model.knowledge,
    model.open_weights,
    model.status,
  ]);

  return (
    <ActionPanel>
      {primaryAction && <ActionPanel.Section>{primaryAction}</ActionPanel.Section>}
      <ActionPanel.Section>
        {showViewDetails && <Action title="View Details" icon={Icon.Eye} onAction={handleViewDetails} />}
        <Action.CopyToClipboard title="Copy Model ID" content={model.id} shortcut={{ modifiers: ["cmd"], key: "." }} />
        <Action.CopyToClipboard
          title="Copy Provider/Model"
          content={`${model.providerId}/${model.id}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action title="Copy as JSON" onAction={handleCopyJson} />
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

      {onAddToComparison && canAddToComparison !== false && (
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
});
