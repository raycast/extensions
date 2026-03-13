import React from "react";
import { List, ActionPanel } from "@raycast/api";
import { ThinkingKeyword } from "../../types";
import { calculateDisplayText } from "../../utils/displayUtils";
import { generateCommandMarkdown } from "../../utils/markdownUtils";
import { createCommandActions } from "./shared/ActionPanels";
import { createItemAccessories } from "./shared/ItemAccessories";
import { MAX_COMBINED_LENGTH } from "../../constants/ui";

interface ThinkingKeywordItemProps {
  keyword: ThinkingKeyword;
  onCopy: (content: string, message: string) => void;
}

export function ThinkingKeywordItem({ keyword, onCopy }: ThinkingKeywordItemProps) {
  const accessories = createItemAccessories(keyword);
  const { displayTitle, displaySubtitle } = calculateDisplayText(
    keyword.keyword,
    keyword.description,
    MAX_COMBINED_LENGTH
  );

  return (
    <List.Item
      key={`thinking-${keyword.keyword.replace(/\s+/g, "-")}`}
      title={displayTitle}
      subtitle={displaySubtitle}
      accessories={accessories}
      actions={<ActionPanel>{createCommandActions({ item: keyword, onCopy })}</ActionPanel>}
      detail={<List.Item.Detail markdown={generateCommandMarkdown(keyword)} />}
    />
  );
}
