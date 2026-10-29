import { Action, Icon, Keyboard } from "@raycast/api";

type CopyStatusPageDetailAsPngActionProps = {
  onCopyAsPng: () => void;
};

export function CopyStatusPageDetailAsPngAction({ onCopyAsPng }: CopyStatusPageDetailAsPngActionProps) {
  return (
    <Action
      title="Copy to Clipboard"
      icon={Icon.Clipboard}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onAction={onCopyAsPng}
    />
  );
}
