import { Action, Keyboard } from "@raycast/api";
import { KEYBOARD_SHORTCUTS } from "../../lib/constants";

interface CopyActionsProps {
  alias: string;
  value: string;
  onCopy?: () => void;
}

export function CopyActions({ alias, value, onCopy }: CopyActionsProps) {
  return (
    <>
      <Action.CopyToClipboard
        title="Copy Value"
        content={value}
        shortcut={KEYBOARD_SHORTCUTS.COPY_VALUE}
        onCopy={onCopy}
      />
      <Action.CopyToClipboard
        title="Copy Alias"
        content={alias}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onCopy={onCopy}
      />
    </>
  );
}
