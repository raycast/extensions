import { ActionPanel, Icon, showToast, Action, Clipboard, Toast } from "@raycast/api";

const copyToClipboard = async (text: string) => {
  await Clipboard.copy(text);
  showToast({
    style: Toast.Style.Success,
    title: "Copied to clipboard",
  });
};

const CopyToClipboardActionPanel = ({ text }: { text?: string }) => {
  return (
    <ActionPanel>
      <Action title="Copy to Clipboard" onAction={() => copyToClipboard(text ?? "")} icon={Icon.Document} />
    </ActionPanel>
  );
};

export default CopyToClipboardActionPanel;
