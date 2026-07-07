import { Action, ActionPanel, Icon, Clipboard, useNavigation, Keyboard } from "@raycast/api";
import { memo, useCallback } from "react";
import { Model } from "../lib/types";
import { ModelDetail } from "./ModelDetail";

interface ModelActionsProps {
  model: Model;
  showViewDetails?: boolean;
}

export const ModelActions = memo(function ModelActions({ model, showViewDetails = true }: ModelActionsProps) {
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
      <ActionPanel.Section>
        {showViewDetails && <Action title="View Details" icon={Icon.Eye} onAction={handleViewDetails} />}
        <Action.CopyToClipboard title="Copy Model ID" content={model.id} shortcut={Keyboard.Shortcut.Common.Pin} />
        <Action.CopyToClipboard
          title="Copy Provider/Model"
          content={`${model.providerId}/${model.id}`}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action title="Copy as JSON" onAction={handleCopyJson} />
        {model.providerDoc && (
          <Action.OpenInBrowser
            title="Open Provider Docs"
            url={model.providerDoc}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
        )}
        <Action.OpenInBrowser
          title="Open Models.dev in Browser"
          url={`https://models.dev`}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
});
