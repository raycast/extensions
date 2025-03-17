import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { downloadFFmpeg } from "../utils/ffmpeg";

export function NotInstalled({ onRefresh }: { onRefresh: () => void }) {
  const handleInstall = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Installing FFmpeg..." });
    try {
      await downloadFFmpeg();
      await toast.hide();
      await showToast({ style: Toast.Style.Success, title: "FFmpeg installed successfully!" });
      onRefresh();
    } catch (error) {
      await toast.hide();
      await showToast({ style: Toast.Style.Failure, title: "Failed to install FFmpeg", message: String(error) });
    }
  };

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action title="Install Ffmpeg" onAction={handleInstall} shortcut={{ modifiers: [], key: "return" }} />
        </ActionPanel>
      }
      markdown={`
# 🚨 FFmpeg is not installed
This extension depends on FFmpeg, which is not detected on your system. You must install it to continue.

Press **⏎** to install FFmpeg using Homebrew. Since FFmpeg is a large utility, 
**it can take up to 2 minutes to install**.

To install Homebrew, visit [this link](https://brew.sh)
      `}
    />
  );
}
