import { ActionPanel } from "@raycast/api";
import { SaveAction, SaveAsSnippetAction } from "./index";

export const SaveActionSection = ({
  onSaveConversationAction,
  onSaveAnswerAction,
  snippet,
}: {
  onSaveConversationAction?: () => void;
  onSaveAnswerAction: () => void;
  snippet?: { text: string; name: string };
}) => (
  <ActionPanel.Section title="Save">
    {onSaveConversationAction && (
      <SaveAction title="Save Conversation" onAction={onSaveConversationAction} modifiers={["cmd"]} />
    )}
    <SaveAction
      title="Save Answer"
      onAction={onSaveAnswerAction}
      modifiers={onSaveConversationAction ? ["cmd", "shift"] : ["cmd"]}
    />
    {snippet && <SaveAsSnippetAction text={snippet.text} name={snippet.name} />}
  </ActionPanel.Section>
);
