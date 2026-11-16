import { shortcuts } from "../lib/shortcuts";
import { Action, Clipboard, Icon, showInFinder, showToast, Toast, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exportPng } from "../lib/files";
import { exportDirectory } from "../lib/settings";

export async function copyImage(path: string) {
  try {
    await Clipboard.copy({ file: path });
    await showToast({ style: Toast.Style.Success, title: "PNG Copied" });
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Copy PNG" });
  }
}

export async function saveImage(path: string) {
  try {
    const destination = await exportPng(path, exportDirectory());
    const toast = await showToast({ style: Toast.Style.Success, title: "PNG Saved", message: destination });
    toast.primaryAction = {
      title: process.platform === "win32" ? "Show in File Explorer" : "Show in Finder",
      onAction: () => showInFinder(destination),
    };
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Save PNG" });
  }
}

export default function ImageActions({ path }: { path: string }) {
  return (
    <>
      <Action title="Copy PNG" icon={Icon.Clipboard} shortcut={shortcuts.copyImage} onAction={() => copyImage(path)} />
      <Action
        title="Save PNG"
        icon={Icon.Download}
        shortcut={Keyboard.Shortcut.Common.Save}
        onAction={() => saveImage(path)}
      />
      <Action.ShowInFinder path={path} />
    </>
  );
}
