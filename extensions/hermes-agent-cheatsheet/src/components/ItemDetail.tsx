import { Detail } from "@raycast/api";
import { cheatsheetItems } from "../data";
import { getExamples, getPrimarySelection } from "../lib/examples";
import { getRelatedItems } from "../lib/related";
import { createItemMarkdown } from "../lib/markdown";
import { getEffectiveStatuses } from "../lib/status";
import type { CheatsheetItem, ExtensionPreferences } from "../types";
import { ItemActions } from "./ItemActions";
import { ItemMetadata } from "./ItemMetadata";

interface ItemDetailProps {
  item: CheatsheetItem;
  preferences: ExtensionPreferences;
  onUse?: (id: string) => void;
  contextCommand?: string;
}

function prioritizeExamples(examples: ReturnType<typeof getExamples>, contextCommand?: string) {
  if (!contextCommand) return examples;
  return [...examples].sort((left, right) => {
    if (left.command === contextCommand) return -1;
    if (right.command === contextCommand) return 1;
    return 0;
  });
}

export function ItemDetail({ item, preferences, onUse, contextCommand }: ItemDetailProps) {
  const relatedItems = getRelatedItems(item, cheatsheetItems);
  const examples = prioritizeExamples(getExamples(item, preferences), contextCommand);
  const primarySelection = getPrimarySelection(item, "", preferences, contextCommand);
  return (
    <Detail
      markdown={createItemMarkdown(item, {
        examples,
        effectiveCommand: primarySelection.content,
        effectiveStatuses: getEffectiveStatuses(item, primarySelection.content),
        relatedItems,
      })}
      metadata={<ItemMetadata item={item} relatedItems={relatedItems} effectiveCommand={primarySelection.content} />}
      actions={
        <ItemActions
          item={item}
          contextCommand={contextCommand}
          preferences={preferences}
          relatedItems={relatedItems}
          onUse={onUse}
          showDetailsAction={false}
        />
      }
    />
  );
}
