import { List, ActionPanel, Action } from "@raycast/api";
import { WordExplanation } from "../types";
import { WordDetail } from "./WordDetail";

interface WordListItemProps {
  word: WordExplanation;
  index?: number;
  total?: number;
  isAiResult: boolean | null;
  onSave?: (word: string, content: string) => void;
  onDelete?: (word: string, timestamp?: string) => void;
  onUpdate?: (word: string) => void;
}

export function WordListItem({
  word,
  index,
  total,
  isAiResult = false,
  onSave,
  onDelete,
  onUpdate,
}: WordListItemProps) {
  return (
    <List.Item
      title={word.word}
      subtitle={word.chinese}
      accessories={[isAiResult ? { text: "AI Result" } : { text: `${index! + 1} of ${total}` }]}
      detail={<WordDetail word={word} />}
      actions={
        <ActionPanel>
          {isAiResult && onSave && (
            <Action title="Save to Vocabulary" icon="💾" onAction={() => onSave(word.word, word.raw_output)} />
          )}
          {!isAiResult && (
            <>
              {onDelete && (
                <Action title="Delete Word" icon="🗑️" onAction={() => onDelete(word.word, word.timestamp)} />
              )}
              {onUpdate && <Action title="Update Word" icon="📝" onAction={() => onUpdate(word.word)} />}
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
