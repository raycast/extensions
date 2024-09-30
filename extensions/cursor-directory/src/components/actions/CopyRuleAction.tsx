import { Action, Icon, showHUD, Clipboard } from "@raycast/api";
import { CursorRule } from "../../types";

interface Props {
  cursorRule: CursorRule;
}

export const CopyRuleAction = ({ cursorRule }: Props) => {
  return (
    <Action
      title="Copy Cursor Rule"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
      onAction={async () => {
        await Clipboard.copy(cursorRule.content);
        await showHUD("Copied to clipboard, paste it into .cursorrules file");
      }}
    />
  );
};
