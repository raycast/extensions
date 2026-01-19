import React from "react";
import { Action, Icon } from "@raycast/api";
import { Command, ThinkingKeyword } from "../../../types";
import { UI_STRINGS } from "../../../constants/strings";
import { CommandDetail } from "../../CommandDetail";

interface CreateActionsProps {
  item: Command | ThinkingKeyword;
  onCopy: (content: string, message: string) => void;
}

export function createCommandActions({ item, onCopy }: CreateActionsProps): React.ReactNode[] {
  const isThinkingKeyword = "keyword" in item;

  const actions: React.ReactNode[] = [];

  if (isThinkingKeyword) {
    const keyword = item as ThinkingKeyword;
    const commandForDetail: Command = {
      id: `thinking-${keyword.keyword.replace(/\s+/g, "-")}`,
      name: keyword.keyword,
      description: keyword.description,
      usage: UI_STRINGS.addToPrompt,
      example: keyword.example || `${UI_STRINGS.yourPromptHere} ${keyword.keyword}`,
      category: "thinking",
      tags: [`${keyword.budget} budget`, `${keyword.tokens} tokens`],
    };

    actions.push(
      <Action
        key="copy-keyword"
        title={UI_STRINGS.copyKeyword}
        icon={Icon.Clipboard}
        onAction={() => onCopy(keyword.keyword, UI_STRINGS.copiedToClipboard.replace("{0}", keyword.keyword))}
      />,
      <Action.Paste
        key="paste-keyword"
        title={UI_STRINGS.pasteKeyword}
        icon={Icon.Text}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        content={keyword.keyword}
      />,
      <Action.Push
        key="show-details"
        title={UI_STRINGS.showDetails}
        icon={Icon.Eye}
        shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
        target={<CommandDetail command={commandForDetail} thinkingKeyword={keyword} />}
      />
    );
  } else {
    const command = item as Command;
    actions.push(
      <Action
        key="copy-command"
        title={UI_STRINGS.copyToClipboard}
        icon={Icon.Clipboard}
        onAction={() => onCopy(command.usage, UI_STRINGS.copiedToClipboard.replace("{0}", command.name))}
      />,
      <Action.Paste
        key="paste-command"
        title={UI_STRINGS.pasteCommand}
        icon={Icon.Terminal}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        content={command.usage}
      />,
      <Action.Push
        key="show-details"
        title={UI_STRINGS.showDetails}
        icon={Icon.Eye}
        shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
        target={<CommandDetail command={command} />}
      />
    );
  }

  return actions;
}
