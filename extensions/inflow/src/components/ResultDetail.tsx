import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { pasteToFrontmostApp } from "../core/output";

type ResultDetailProps = {
  result: string;
  isLoading?: boolean;
  navigationTitle?: string;
  onCancel?: () => void;
};

export function ResultDetail({
  result,
  isLoading = false,
  navigationTitle,
  onCancel,
}: ResultDetailProps) {
  const hasResult = result.trim().length > 0;
  const markdown = hasResult ? result.replace(/\n/g, "  \n") : "";

  const handleCopy = async () => {
    await Clipboard.copy(result);
    await closeMainWindow();
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
  };

  const handlePaste = async () => {
    await closeMainWindow();
    await pasteToFrontmostApp(result);
  };

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          {isLoading && (
            <Action
              title="Cancel"
              icon={Icon.Stop}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={onCancel}
            />
          )}
          {!isLoading && hasResult && (
            <Action
              title="Paste to App"
              icon={Icon.Pencil}
              onAction={handlePaste}
            />
          )}
          {!isLoading && hasResult && (
            <Action
              title="Copy Result"
              icon={Icon.CopyClipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={handleCopy}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
