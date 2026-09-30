import { ActionPanel, Action, List, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { WordDetail } from "./WordDetail";
import { searchWord } from "../api/rae";

interface SuggestionDetailProps {
  word: string;
}

function SuggestionDetail({ word }: SuggestionDetailProps) {
  const { data: wordEntry, isLoading, error } = usePromise(searchWord, [word]);

  if (isLoading) {
    return <Detail isLoading={true} markdown={`# ${word}\n\nLoading definition...`} />;
  }

  if (error || !wordEntry) {
    return (
      <Detail
        markdown={`# ${word}\n\n⚠️ Could not load definition.\n\n${error?.message || ""}`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Word" content={word} />
          </ActionPanel>
        }
      />
    );
  }

  return <WordDetail wordEntry={wordEntry} />;
}

interface SuggestionItemProps {
  word: string;
}

export function SuggestionItem({ word }: SuggestionItemProps) {
  return (
    <List.Item
      id={word}
      title={word}
      icon={Icon.QuestionMarkCircle}
      accessories={[{ text: "Did you mean?" }]}
      actions={
        <ActionPanel>
          <Action.Push title="View Details" target={<SuggestionDetail word={word} />} />
          <Action.CopyToClipboard title="Copy Word" content={word} />
        </ActionPanel>
      }
    />
  );
}
