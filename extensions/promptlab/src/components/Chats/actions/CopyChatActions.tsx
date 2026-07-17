import { Action, ActionPanel } from "@raycast/api";
import { defaultAdvancedSettings } from "../../../data/default-advanced-settings";
import { anyActionsEnabled, getActionShortcut } from "../../../lib/actions";

export const CopyChatActionsSection = (props: {
  response: string;
  query: string;
  basePrompt: string;
  settings: typeof defaultAdvancedSettings;
}) => {
  const { response, query, basePrompt, settings } = props;

  if (!anyActionsEnabled(["CopyChatResponseAction", "CopyChatQueryAction", "CopyChatBasePromptAction"], settings)) {
    return null;
  }

  return (
    <ActionPanel.Section title="Clipboard Actions">
      <Action.CopyToClipboard
        title="Copy Response"
        content={response}
        shortcut={getActionShortcut("CopyChatResponseAction", settings)}
      />
      <Action.CopyToClipboard
        title="Copy Sent Query"
        content={query}
        shortcut={getActionShortcut("CopyChatQueryAction", settings)}
      />
      <Action.CopyToClipboard
        title="Copy Base Prompt"
        content={basePrompt}
        shortcut={getActionShortcut("CopyChatBasePromptAction", settings)}
      />
    </ActionPanel.Section>
  );
};
