import { Action, Clipboard, Icon, showToast, Toast } from "@raycast/api";

export const ActionCopyToClipboard = function ActionCopyToClipboard({
  onCopy,
  content,
  toastTitle,
  ...props
}: Action.Props & {
  toastTitle?: string;
  onCopy?: (content: string) => void;
  content: string;
}) {
  return (
    <Action
      {...props}
      icon={{ source: Icon.Clipboard }}
      onAction={async () => {
        await Clipboard.copy(content);
        if (toastTitle) {
          await showToast({ title: toastTitle, style: Toast.Style.Success });
        }
        if (onCopy) onCopy(content);
      }}
    />
  );
};
