import { Action, Icon, closeMainWindow } from "@raycast/api";
import { captureScreenshot } from "../../services/captureScreenshot";
import { captureScreenshotWindows } from "../../services/captureScreenshotWindows";
import type { DecodeAction } from "../../types";
import { runOrToast } from "./runOrToast";

interface Props {
  onDecode: DecodeAction;
}

async function handleCapture(onDecode: DecodeAction, capture: () => Promise<string>) {
  await closeMainWindow();
  await runOrToast(capture, onDecode, "screenshot");
}

export default function CaptureAction({ onDecode }: Props) {
  if (process.platform === "darwin") {
    return (
      <Action
        title="Capture Screenshot"
        icon={Icon.Camera}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={() => handleCapture(onDecode, captureScreenshot)}
      />
    );
  }
  if (process.platform === "win32") {
    return (
      <Action
        title="Capture Screenshot"
        icon={Icon.Camera}
        shortcut={{ modifiers: ["cmd"], key: "s" }}
        onAction={() => handleCapture(onDecode, captureScreenshotWindows)}
      />
    );
  }
  return null;
}
