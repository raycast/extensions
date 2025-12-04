import React from "react";
import { List, ActionPanel } from "@raycast/api";
import { Command } from "../../types";
import { formatDisplayTitle, formatDisplaySubtitle } from "../../utils/displayUtils";
import { generateCommandMarkdown } from "../../utils/markdownUtils";
import { createCommandActions } from "./shared/ActionPanels";
import { createItemAccessories } from "./shared/ItemAccessories";
import { MAX_COMBINED_LENGTH } from "../../constants/ui";

interface CommandItemProps {
  command: Command;
  onCopy: (content: string, message: string) => void;
}

export function CommandItem({ command, onCopy }: CommandItemProps) {
  const accessories = createItemAccessories(command);
  const displayTitle = formatDisplayTitle(command.name, command.deprecated);
  const displaySubtitle = formatDisplaySubtitle(
    command.description,
    command.deprecated,
    command.alternative,
    MAX_COMBINED_LENGTH,
    displayTitle.length
  );

  return (
    <List.Item
      key={command.id}
      title={displayTitle}
      subtitle={displaySubtitle}
      accessories={accessories}
      actions={<ActionPanel>{createCommandActions({ item: command, onCopy })}</ActionPanel>}
      detail={<List.Item.Detail markdown={generateCommandMarkdown(command)} />}
    />
  );
}
