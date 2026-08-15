import React from "react";
import { ActionPanel, Action, Icon } from "@raycast/api";
import { Command } from "../../types";
import { UI_STRINGS } from "../../constants/strings";

interface DetailActionsProps {
  command: Command;
  onCopy: (content: string, message: string) => void;
}

export function DetailActions({ command, onCopy }: DetailActionsProps) {
  const isThinkingCategory = command.category === "thinking";

  return (
    <ActionPanel>
      {isThinkingCategory ? (
        <>
          <Action
            title={UI_STRINGS.copyKeyword}
            icon={Icon.Clipboard}
            onAction={() => onCopy(command.name, UI_STRINGS.keywordCopied.replace("{0}", command.name))}
          />
          <Action.Paste
            title={UI_STRINGS.pasteKeyword}
            icon={Icon.Text}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            content={command.name}
          />
        </>
      ) : (
        <>
          <Action
            title={UI_STRINGS.copyUsage}
            icon={Icon.Clipboard}
            onAction={() => onCopy(command.usage, UI_STRINGS.usageCopied)}
          />
          <Action.Paste
            title={UI_STRINGS.pasteUsage}
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            content={command.usage}
          />
        </>
      )}

      {command.example && command.example !== command.usage && (
        <>
          <Action
            title={UI_STRINGS.copyExample}
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "c" }}
            onAction={() => onCopy(command.example!, UI_STRINGS.exampleCopied)}
          />
          <Action.Paste
            title={UI_STRINGS.pasteExample}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "p" }}
            content={command.example!}
          />
        </>
      )}
    </ActionPanel>
  );
}
