import { Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { ComposedSentence } from "../hooks/useComposeWords";
import { saveMdDefinitionToVocabulary } from "../services/mdDefinitionService";

interface ComposedSentenceDetailProps {
  composedSentence: ComposedSentence;
  onRegenerate: () => void;
  onGenerateNewWords: () => void;
}

export function ComposedSentenceDetail({
  composedSentence,
  onRegenerate,
  onGenerateNewWords,
}: ComposedSentenceDetailProps) {
  const markdown = `
# ${composedSentence.word1} + ${composedSentence.word2}

> _${composedSentence.english}_

> _${composedSentence.chinese}_
`;

  const handleSave = async () => {
    const content = `## ${composedSentence.word1} + ${composedSentence.word2}

- ${composedSentence.english}

- ${composedSentence.chinese}`;

    await showToast({
      style: Toast.Style.Animated,
      title: "Saving sentence...",
    });

    const success = await saveMdDefinitionToVocabulary(content);

    if (success) {
      await showToast({
        style: Toast.Style.Success,
        title: "Sentence saved!",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save sentence",
      });
    }
  };

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Save Sentence"
            icon={Icon.SaveDocument}
            onAction={handleSave}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title="Regenerate Sentence"
            icon={Icon.RotateClockwise}
            onAction={onRegenerate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Generate with New Words"
            icon={Icon.Shuffle}
            onAction={onGenerateNewWords}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action.CopyToClipboard
            title="Copy English Sentence"
            content={composedSentence.english}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Chinese Translation"
            content={composedSentence.chinese}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
