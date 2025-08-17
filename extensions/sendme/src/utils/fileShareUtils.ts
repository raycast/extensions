import { showToast, Toast, Clipboard } from "@raycast/api";
// Remove the unused import
import { startSendmeProcess } from "./sendme";
// Remove unused import for sendmeInTerminal

export interface FileShareResult {
  successCount: number;
  failureCount: number;
  lastTicket: string;
  successFiles: string[];
  failedFiles: string[];
}

export async function shareMultipleFiles(
  filePaths: string[],
): Promise<FileShareResult> {
  const result: FileShareResult = {
    successCount: 0,
    failureCount: 0,
    lastTicket: "",
    successFiles: [],
    failedFiles: [],
  };

  if (!filePaths?.length) {
    return result;
  }

  // Process each file sequentially
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    const success = await processFile(filePath);

    if (success.success) {
      result.successCount++;
      result.successFiles.push(success.fileName);
      result.lastTicket = success.ticket;
    } else {
      result.failureCount++;
      result.failedFiles.push(success.fileName);
    }
  }

  // Copy the last successful ticket to clipboard
  if (result.lastTicket) {
    await Clipboard.copy(result.lastTicket);
  }

  return result;
}

export async function processFile(filePath: string): Promise<{
  success: boolean;
  fileName: string;
  ticket: string;
}> {
  try {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const fileName = filePath.split("/").pop() || "";

    // Use await here as startSendmeProcess is now async
    const ticket = await startSendmeProcess(filePath, sessionId);

    return {
      success: true,
      fileName,
      ticket,
    };
  } catch (error) {
    console.error(`Failed to process file: ${filePath}`, error);
    return {
      success: false,
      fileName: filePath.split("/").pop() || "",
      ticket: "",
    };
  }
}

// Update showShareResults to avoid using sendmeInTerminal directly
export async function showShareResults(result: FileShareResult): Promise<void> {
  if (result.successCount > 0) {
    if (result.failureCount > 0) {
      // Some succeeded, some failed
      await showToast({
        style: Toast.Style.Success,
        title: `Shared ${result.successCount} file(s)`,
        message: `${result.failureCount} file(s) failed. Last ticket copied to clipboard.`,
      });
    } else {
      // All succeeded
      await showToast({
        style: Toast.Style.Success,
        title:
          result.successCount === 1
            ? `File shared: ${result.successFiles[0]}`
            : `${result.successCount} files shared successfully`,
        message: "Ticket copied to clipboard",
      });
    }
  } else if (result.failureCount > 0) {
    // All failed
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to share files",
      message: "Try using Terminal fallback",
      primaryAction: {
        title: "Use Terminal",
        onAction: () => {
          // Instead of direct reference, create a safer fallback
          if (result.failedFiles.length > 0) {
            import("./terminal").then(({ sendmeInTerminal }) => {
              sendmeInTerminal(result.failedFiles[0]);
            });
          }
        },
      },
    });
  }
}
