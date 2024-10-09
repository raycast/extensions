import { Action, Icon, showHUD, Clipboard, Keyboard } from "@raycast/api";
import { CursorRule } from "../../types";

interface Props {
  cursorRule: CursorRule;
}

export const CopyRuleAction = ({ cursorRule }: Props) => {
  return (
    <Action
      title="Copy Cursor Rule"
      icon={Icon.Clipboard}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onAction={async () => {
        await Clipboard.copy(cursorRule.content);
        await showHUD("Copied to clipboard, paste it into .cursorrules file");
      }}
    />
  );
};
