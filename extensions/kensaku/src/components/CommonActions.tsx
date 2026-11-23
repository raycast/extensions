import path from "node:path";
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { modShortcut } from "../lib/format";
import { getErrorDescription, restartServer } from "../lib/kensaku";
import type { ExtensionPreferences } from "../lib/types";

interface FileActionSectionProps {
  filePath: string;
}

/** Standard file opening, revealing, and path-copy actions shared across commands. */
export function FileActionSection({ filePath }: FileActionSectionProps) {
  const revealTitle = process.platform === "win32" ? "Show in File Explorer" : "Show in Finder";

  return (
    <ActionPanel.Section title="File">
      <Action.Open title="Open File" target={filePath} />
      <Action.ShowInFinder title={revealTitle} path={filePath} />
      <Action.Open
        title="Open Containing Folder"
        icon={Icon.Folder}
        target={path.dirname(filePath)}
        shortcut={modShortcut(["shift"], "o")}
      />
      <Action.CopyToClipboard title="Copy File Path" content={filePath} shortcut={Keyboard.Shortcut.Common.CopyPath} />
      <Action.CopyToClipboard
        title="Copy File Name"
        content={path.basename(filePath)}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
    </ActionPanel.Section>
  );
}

interface ServerActionSectionProps {
  onRefresh?: () => void;
  onServerRestarted?: () => void;
}

/** Server lifecycle and preferences actions shared across commands. */
export function ServerActionSection({ onRefresh, onServerRestarted }: ServerActionSectionProps) {
  async function handleRestartServer() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Restarting Kensaku Server...",
    });
    try {
      const prefs = getPreferenceValues<ExtensionPreferences>();
      const { port } = await restartServer(prefs);
      toast.style = Toast.Style.Success;
      toast.title = "Kensaku Server Restarted";
      toast.message = `Listening on port ${port}`;
      onServerRestarted?.();
    } catch (error) {
      await toast.hide();
      const { title, message } = getErrorDescription(error);
      await showFailureToast(message, { title });
    }
  }

  return (
    <ActionPanel.Section title="Server">
      {onRefresh && (
        <Action
          title="Refresh Results"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      )}
      <Action
        title="Restart Search Server"
        icon={Icon.RotateClockwise}
        shortcut={modShortcut(["shift"], "r")}
        onAction={handleRestartServer}
      />
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        shortcut={modShortcut([], ",")}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}
