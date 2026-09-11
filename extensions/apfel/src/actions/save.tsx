import { ActionPanel } from "@raycast/api";
import { SaveAnswerAction, SaveAsSnippetAction } from "./index";

export const SaveActionSection = ({
  onSaveAnswerAction,
  snippet,
}: {
  onSaveAnswerAction: () => void;
  snippet?: { text: string; name: string };
}) => (
  <ActionPanel.Section title="Save">
    <SaveAnswerAction onAction={onSaveAnswerAction} />
    {snippet && <SaveAsSnippetAction text={snippet.text} name={snippet.name} />}
  </ActionPanel.Section>
);
