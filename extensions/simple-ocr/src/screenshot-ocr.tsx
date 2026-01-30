import {
  Detail,
  showToast,
  Toast,
  ActionPanel,
  Action,
  closeMainWindow,
  Clipboard as RaycastClipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { execFile, exec } from "child_process";
import { promisify } from "util";
import { performOCR } from "./utils";

const execFileAsync = promisify(execFile);
const execAsyncLocal = promisify(exec);

export default function Command() {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function captureAndProcess() {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Select area to capture...",
        });
        await closeMainWindow();
        // Increased delay to ensure system is ready
        await new Promise((resolve) => setTimeout(resolve, 800));

        // Silent cleanup of any stale processes
        try {
          await execAsyncLocal("/usr/bin/killall -9 screencapture");
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch {
          // No process to kill
        }

        // Capture directly to clipboard (-c)
        try {
          await execFileAsync("/usr/sbin/screencapture", ["-i", "-c"]);
        } catch {
          // Silently handle - user might have cancelled or a transient conflict occurred
        }

        // Read from clipboard
        const { file } = await RaycastClipboard.read();
        if (!file) {
          setIsLoading(false);
          return; // Likely cancelled
        }

        await showToast({
          style: Toast.Style.Animated,
          title: "Processing text...",
        });

        const result = await performOCR(file);

        if (result) {
          setText(result);
          await RaycastClipboard.copy(result);
          await showToast({
            style: Toast.Style.Success,
            title: "OCR Completed",
            message: "Result copied to clipboard",
          });
        } else {
          setText("No text detected.");
          await showToast({
            style: Toast.Style.Failure,
            title: "No text found",
          });
        }
      } catch (error) {
        console.error("Screenshot OCR error:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "OCR Failed",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    captureAndProcess();
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={text || "*Taking screenshot...*"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={text} />
        </ActionPanel>
      }
    />
  );
}
