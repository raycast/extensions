import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  Clipboard,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { extractTaskFromPDF } from "./utils/janApi";
import { createReminder, verifyReminderList, createReminderList, showRemindersInApp } from "./utils/reminderUtils";

export default function Command() {
  const [pdfPath, setPdfPath] = useState<string>("");
  const [clipboardFiles, setClipboardFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const listName = preferences.reminderList || "To Do";

  // Check clipboard on load
  useEffect(() => {
    async function checkClipboard() {
      try {
        const clipboardContent = await Clipboard.read();

        // Check for file
        if (clipboardContent.file) {
          let filePath = clipboardContent.file;
          // Strip file:// prefix and decode URL encoding
          if (filePath.startsWith("file://")) {
            filePath = decodeURIComponent(filePath.replace("file://", ""));
          }
          if (filePath.toLowerCase().endsWith(".pdf")) {
            console.log(`[Clipboard] Detected PDF file: ${filePath}`);
            setClipboardFiles([filePath]);
          }
        }

        // Check for text paths
        if (clipboardContent.text) {
          const text = clipboardContent.text;
          const lines = text.split("\n").map((l) => l.trim());
          const pdfPaths = lines
            .filter(
              (line) =>
                line.toLowerCase().endsWith(".pdf") &&
                (line.startsWith("/") || line.startsWith("~") || line.startsWith("file://")),
            )
            .map((line) => {
              if (line.startsWith("file://")) {
                return decodeURIComponent(line.replace("file://", ""));
              }
              return line;
            });
          if (pdfPaths.length > 0) {
            console.log(`[Clipboard] Detected ${pdfPaths.length} PDF path(s)`);
            setClipboardFiles(pdfPaths);
          }
        }
      } catch (error) {
        console.error("[Clipboard] Error reading clipboard:", error);
      }
    }

    checkClipboard();
  }, []);

  async function handleSubmit(values: { pdfFile: string[] }) {
    setIsLoading(true);

    try {
      // Get the PDF path from either the form or clipboard
      let targetPath = "";
      if (values.pdfFile && values.pdfFile.length > 0) {
        targetPath = values.pdfFile[0];
      } else if (pdfPath) {
        targetPath = pdfPath;
      } else if (clipboardFiles.length > 0) {
        targetPath = clipboardFiles[0];
      }

      if (!targetPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Please select a PDF file",
        });
        setIsLoading(false);
        return;
      }

      // Process file:// URLs
      if (targetPath.startsWith("file://")) {
        targetPath = decodeURIComponent(targetPath.replace("file://", ""));
      }

      console.log(`[ProcessPDF] Processing: ${targetPath}`);

      await showToast({
        style: Toast.Style.Animated,
        title: "Extracting invoice data...",
      });

      // Extract tasks from PDF
      const tasks = await extractTaskFromPDF(targetPath);

      await showToast({
        style: Toast.Style.Animated,
        title: `Creating ${tasks.length} reminder${tasks.length > 1 ? "s" : ""}...`,
      });

      // Verify reminder list exists, create if needed
      const listExists = await verifyReminderList(listName);
      if (!listExists) {
        await createReminderList(listName);
      }

      // Create all reminders and collect IDs
      const reminderIds: string[] = [];
      for (const task of tasks) {
        const reminderId = await createReminder(task, listName);
        reminderIds.push(reminderId);
      }

      // Show reminders in Reminders app
      await showRemindersInApp(reminderIds, listName);

      // Show success message
      if (tasks.length === 1) {
        const task = tasks[0];
        const successMessage = [
          `"${task.title}"`,
          task.dueDate ? `due ${task.dueDate}` : null,
          task.amount ? `($${task.amount.toFixed(2)})` : null,
        ]
          .filter(Boolean)
          .join(" ");

        await showToast({
          style: Toast.Style.Success,
          title: "Reminder created",
          message: successMessage,
        });
      } else {
        // Multiple tasks
        const summary = tasks
          .map((t) => {
            const parts = [t.title];
            if (t.amount) parts.push(`$${t.amount.toFixed(2)}`);
            if (t.dueDate) parts.push(t.dueDate);
            return parts.join(" - ");
          })
          .join("\n");

        await showToast({
          style: Toast.Style.Success,
          title: `${tasks.length} reminders created`,
          message: summary.length > 100 ? `${summary.substring(0, 100)}...` : summary,
        });
      }

      // Close the form
      pop();
    } catch (error) {
      console.error("[ProcessPDF] Error:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to process PDF",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle paste from clipboard shortcut
  async function handlePasteFromClipboard() {
    if (clipboardFiles.length > 0) {
      setPdfPath(clipboardFiles[0]);
      await showToast({
        style: Toast.Style.Success,
        title: "PDF loaded from clipboard",
        message: clipboardFiles[0].split("/").pop() || "PDF file",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "No PDF in clipboard",
        message: "Copy a PDF file in Finder first (⌘C)",
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Reminder from PDF" onSubmit={handleSubmit} />
          {clipboardFiles.length > 0 && (
            <Action
              title="Paste from Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "v" }}
              onAction={handlePasteFromClipboard}
            />
          )}
        </ActionPanel>
      }
    >
      {clipboardFiles.length > 0 && (
        <Form.Description
          title="Clipboard"
          text={`📋 Clipboard contains ${clipboardFiles.length} PDF(s). Press ⌘V to use it, or select a file below.`}
        />
      )}

      <Form.FilePicker
        id="pdfFile"
        title="PDF File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={pdfPath ? [pdfPath] : []}
        onChange={(newValue) => {
          if (newValue.length > 0) {
            setPdfPath(newValue[0]);
          }
        }}
      />

      <Form.Description
        title="Instructions"
        text="Select a PDF invoice or copy it in Finder (⌘C) then press ⌘V. The AI will extract payment information and create reminders."
      />
    </Form>
  );
}
