import { ActionPanel } from "@raycast/api";
import { PinAnswerAction, SaveAsSnippetAction } from "./index";

/**
 * The section deliberately mixes two verbs, because these are two genuinely different
 * operations: `PinAnswerAction` flags a conversation inside this extension, while
 * `SaveAsSnippetAction` writes a real snippet into Raycast's own snippet store. "Save" is
 * accurate for the second and was misleading for the first — see `PinAnswerAction`.
 */
export const PinActionSection = ({
  onPinAnswerAction,
  snippet,
}: {
  onPinAnswerAction: () => void;
  snippet?: { text: string; name: string };
}) => (
  <ActionPanel.Section title="Pin">
    <PinAnswerAction onAction={onPinAnswerAction} />
    {snippet && <SaveAsSnippetAction text={snippet.text} name={snippet.name} />}
  </ActionPanel.Section>
);
