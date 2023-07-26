import { MenuBarExtra, Icon, openCommandPreferences, Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { getErrorMessage } from "../utils";

export function MenuBarItemConfigureCommand(): JSX.Element {
  return (
    <MenuBarExtra.Item
      title="Configure Command"
      shortcut={{ modifiers: ["cmd"], key: "," }}
      icon={Icon.Gear}
      onAction={() => openCommandPreferences()}
    />
  );
}

export function CopyToClipboardMenubarItem(props: { title: string; content: string; tooltip?: string }) {
  const copyToClipboard = async () => {
    try {
      console.log(props.content);
      await Clipboard.copy(props.content);
      showHUD("Copied to Clipboard");
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: getErrorMessage(error) });
    }
  };
  return (
    <MenuBarExtra.Item
      title={props.title}
      icon={Icon.CopyClipboard}
      onAction={copyToClipboard}
      tooltip={props.tooltip}
    />
  );
}
