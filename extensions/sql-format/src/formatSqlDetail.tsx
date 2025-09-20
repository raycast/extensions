import {
  ActionPanel,
  Action,
  Detail,
  getPreferenceValues,
  Clipboard,
  Icon,
  Toast,
  showToast,
  closeMainWindow,
} from "@raycast/api";

interface Preferences {
  autopaste: boolean;
}

/**
 * Component for displaying formatted SQL with copy/paste actions
 * @param sql - The formatted SQL string to display
 */
export const FormattedSqlDetail = ({ sql }: { sql: string }) => {
  const { autopaste } = getPreferenceValues<Preferences>();

  // Handles copying SQL to clipboard and shows success toast
  const handleCopy = async () => {
    await Clipboard.copy(sql);
    await closeMainWindow();
    await showToast(Toast.Style.Success, "Copied to clipboard");
  };

  // Handles pasting SQL to clipboard and shows success toast
  return (
    <Detail
      markdown={`\`\`\`sql\n${sql}\n\`\`\``}
      navigationTitle="Formatted SQL"
      actions={
        <ActionPanel>
          {autopaste && <Action.Paste title="Paste" content={sql} />}
          {!autopaste && <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={handleCopy} />}
        </ActionPanel>
      }
    />
  );
};
