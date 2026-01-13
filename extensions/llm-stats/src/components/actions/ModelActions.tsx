import { ActionPanel, Action, Icon } from "@raycast/api";
import { ModelDetailForm } from "../views/ModelDetailForm";
import { ModelDetailsLinkAction } from "./ModelDetailsLinkAction";

interface ModelActionsProps {
  modelId: string;
  modelName: string;
}

/**
 * Common ActionPanel component for model list items
 */
export function ModelActions({ modelId, modelName }: ModelActionsProps) {
  return (
    <ActionPanel>
      <Action.Push title="Show Details" target={<ModelDetailForm modelId={modelId} />} icon={Icon.Info} />
      <ModelDetailsLinkAction modelId={modelId} />
      <Action.CopyToClipboard title="Copy Model Name" content={modelName} shortcut={{ modifiers: ["cmd"], key: "c" }} />
    </ActionPanel>
  );
}
