import { List, ActionPanel, Action } from "@raycast/api";
import { MdDefinition } from "../types";
import { MdDefinitionDetail } from "./MdDefinitionDetail";

interface MdDefinitionListItemProps {
  mdDefinition: MdDefinition;
  index?: number;
  total?: number;
  isAiResult: boolean | null;
  onSave?: (content: string) => void;
  onDelete?: (timestamp: string) => void;
  onUpdate?: (text: string, timestamp: string) => void;
}

export function MdDefinitionListItem({
  mdDefinition,
  index,
  total,
  isAiResult = false,
  onSave,
  onDelete,
  onUpdate,
}: MdDefinitionListItemProps) {
  return (
    <List.Item
      title={mdDefinition.text}
      subtitle={mdDefinition.chinese}
      accessories={[isAiResult ? { text: "AI Result" } : { text: `${index! + 1} of ${total}` }]}
      detail={<MdDefinitionDetail mdDefinition={mdDefinition} />}
      actions={
        <ActionPanel>
          {isAiResult && onSave && (
            <Action title="Save to Vocabulary" icon="💾" onAction={() => onSave(mdDefinition.raw_output)} />
          )}
          {!isAiResult && (
            <>
              {onDelete && mdDefinition.timestamp && (
                <Action title="Delete Definition" icon="🗑️" onAction={() => onDelete(mdDefinition.timestamp)} />
              )}
              {onUpdate && mdDefinition.timestamp && (
                <Action
                  title="Update Definition"
                  icon="📝"
                  onAction={() => onUpdate(mdDefinition.text, mdDefinition.timestamp)}
                />
              )}
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
