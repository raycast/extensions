import { List, ActionPanel, Action, Keyboard, Icon } from "@raycast/api";
import { MdDefinition } from "../types";
import { MdDefinitionDetail } from "./MdDefinitionDetail";

interface MdDefinitionListItemProps {
  mdDefinition: MdDefinition;
  isAiResult: boolean | null;
  onSave?: (content: string) => void;
  onDelete?: (timestamp: string) => void;
  onUpdate?: (text: string, timestamp: string) => void;
}

export function MdDefinitionListItem({
  mdDefinition,
  isAiResult = false,
  onSave,
  onDelete,
  onUpdate,
}: MdDefinitionListItemProps) {
  return (
    <List.Item
      title={mdDefinition.text}
      subtitle={mdDefinition.chinese}
      accessories={isAiResult ? [{ text: "AI Result" }] : []}
      detail={<MdDefinitionDetail mdDefinition={mdDefinition} />}
      actions={
        <ActionPanel>
          {isAiResult && onSave && (
            <Action
              title="Save to Vocabulary"
              icon={Icon.PlusCircle}
              onAction={() => onSave(mdDefinition.raw_output)}
            />
          )}
          {!isAiResult && (
            <>
              {onUpdate && mdDefinition.timestamp && (
                <Action
                  title="Update Definition"
                  icon={Icon.Pencil}
                  onAction={() => onUpdate(mdDefinition.text, mdDefinition.timestamp)}
                />
              )}
              {onDelete && mdDefinition.timestamp && (
                <Action
                  title="Delete Definition"
                  onAction={() => onDelete(mdDefinition.timestamp)}
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              )}
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
