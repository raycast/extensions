import { Action, Icon, Keyboard } from "@raycast/api";

type CopyScheduleActionProps = {
  onCopyAsPng: () => void;
};

export function CopyScheduleAction({ onCopyAsPng }: CopyScheduleActionProps) {
  return (
    <Action
      title="Copy Schedule to Clipboard"
      icon={Icon.Clipboard}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onAction={onCopyAsPng}
    />
  );
}
