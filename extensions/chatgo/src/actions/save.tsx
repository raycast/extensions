import { ActionPanel } from "@raycast/api";
import { SaveAction } from "./index";

export const SaveActionSection = ({
  onSaveConversationAction,
  onSaveAnswerAction,
}: {
  onSaveConversationAction?: () => void;
  onSaveAnswerAction: () => void;
  snippet?: { text: string; name: string };
}) => {
  return (
    <ActionPanel.Section title="Save">
      {onSaveConversationAction && (
        <SaveAction title="Save Conversation" onAction={onSaveConversationAction} modifiers={["cmd"]} />
      )}
      <SaveAction
        title="Save Answer"
        onAction={onSaveAnswerAction}
        modifiers={onSaveConversationAction ? ["cmd", "shift"] : ["cmd"]}
      />
    </ActionPanel.Section>
  );
};
