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
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { sendToJanAiWithPDF, extractTaskFromPDF } from "./utils/janApi";
import { createReminder, verifyReminderList, createReminderList, showRemindersInApp } from "./utils/reminderUtils";

type ActionType = "extract-tasks" | "summarize" | "custom";

interface FormValues {
  pdfFiles: string[];
  action: ActionType;
  customPrompt?: string;
}

export default function Command() {
  const [clipboardFiles, setClipboardFiles] = useState<string[]>([]);
  const { push } = useNavigation();
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

  async function handleSubmit(values: FormValues) {
    try {
      // Get PDF paths
      let pdfPaths: string[] = [];
      if (values.pdfFiles && values.pdfFiles.length > 0) {
        pdfPaths = values.pdfFiles;
      } else if (clipboardFiles.length > 0) {
        pdfPaths = clipboardFiles;
      }

      if (pdfPaths.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Please select at least one PDF file",
        });
        return;
      }

      // Process file:// URLs
      pdfPaths = pdfPaths.map((path) => {
        if (path.startsWith("file://")) {
          return decodeURIComponent(path.replace("file://", ""));
        }
        return path;
      });

      console.log(`[ProcessPDF] Processing ${pdfPaths.length} PDF(s) with action: ${values.action}`);

      // Handle different actions
      if (values.action === "extract-tasks") {
        await handleExtractTasks(pdfPaths);
      } else if (values.action === "summarize") {
        await handleSummarize(pdfPaths);
      } else if (values.action === "custom") {
        if (!values.customPrompt || values.customPrompt.trim() === "") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: "Please enter a custom prompt",
          });
          return;
        }
        await handleCustomPrompt(pdfPaths, values.customPrompt);
      }
    } catch (error) {
      console.error("[ProcessPDF] Error:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to process PDF",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  async function handleExtractTasks(pdfPaths: string[]) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Extracting tasks from PDF(s)...",
    });

    const allTasks = [];

    // Process each PDF
    for (const pdfPath of pdfPaths) {
      const tasks = await extractTaskFromPDF(pdfPath);
      allTasks.push(...tasks);
    }

    if (allTasks.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No tasks found",
        message: "Could not extract any tasks from the PDF(s)",
      });
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: `Creating ${allTasks.length} reminder${allTasks.length > 1 ? "s" : ""}...`,
    });

    // Verify reminder list exists, create if needed
    const listExists = await verifyReminderList(listName);
    if (!listExists) {
      await createReminderList(listName);
    }

    // Create all reminders and collect IDs
    const reminderIds: string[] = [];
    for (const task of allTasks) {
      const reminderId = await createReminder(task, listName);
      reminderIds.push(reminderId);
    }

    // Show reminders in Reminders app
    await showRemindersInApp(reminderIds, listName);

    // Show success message
    if (allTasks.length === 1) {
      const task = allTasks[0];
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
      const summary = allTasks
        .map((t) => {
          const parts = [t.title];
          if (t.amount) parts.push(`$${t.amount.toFixed(2)}`);
          if (t.dueDate) parts.push(t.dueDate);
          return parts.join(" - ");
        })
        .join("\n");

      await showToast({
        style: Toast.Style.Success,
        title: `${allTasks.length} reminders created`,
        message: summary.length > 100 ? `${summary.substring(0, 100)}...` : summary,
      });
    }
  }

  async function handleSummarize(pdfPaths: string[]) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Summarizing PDF(s)...",
    });

    const allResults: string[] = [];

    for (const pdfPath of pdfPaths) {
      const fileName = pdfPath.split("/").pop() || "PDF";
      const userPrompt =
        "Summarize this document concisely. Include the main points, key information, and any important details.";

      const result = await sendToJanAiWithPDF(pdfPath, userPrompt);

      if (pdfPaths.length > 1) {
        allResults.push(`## ${fileName}\n\n${result}`);
      } else {
        allResults.push(result);
      }
    }

    const finalResult = allResults.join("\n\n---\n\n");

    // Copy to clipboard
    await Clipboard.copy(finalResult);

    // Show result in detail view
    push(
      <Detail
        markdown={finalResult}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard" content={finalResult} />
            <Action.Paste content={finalResult} />
          </ActionPanel>
        }
      />,
    );

    await showToast({
      style: Toast.Style.Success,
      title: "Summary copied to clipboard",
      message: pdfPaths.length > 1 ? `Summarized ${pdfPaths.length} PDFs` : "Summary complete",
    });
  }

  async function handleCustomPrompt(pdfPaths: string[], customPrompt: string) {
    await showToast({
      style: Toast.Style.Animated,
      title: "Processing PDF(s) with custom prompt...",
    });

    const allResults: string[] = [];

    for (const pdfPath of pdfPaths) {
      const fileName = pdfPath.split("/").pop() || "PDF";
      const result = await sendToJanAiWithPDF(pdfPath, customPrompt);

      if (pdfPaths.length > 1) {
        allResults.push(`## ${fileName}\n\n${result}`);
      } else {
        allResults.push(result);
      }
    }

    const finalResult = allResults.join("\n\n---\n\n");

    // Copy to clipboard
    await Clipboard.copy(finalResult);

    // Show result in detail view
    push(
      <Detail
        markdown={finalResult}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy to Clipboard" content={finalResult} />
            <Action.Paste content={finalResult} />
          </ActionPanel>
        }
      />,
    );

    await showToast({
      style: Toast.Style.Success,
      title: "Result copied to clipboard",
      message: pdfPaths.length > 1 ? `Processed ${pdfPaths.length} PDFs` : "Processing complete",
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Process PDF" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {clipboardFiles.length > 0 && (
        <Form.Description
          title="Clipboard"
          text={`📋 Clipboard contains ${clipboardFiles.length} PDF(s). Leave the file picker empty to use clipboard files.`}
        />
      )}

      <Form.FilePicker id="pdfFiles" title="PDF Files" allowMultipleSelection={true} canChooseDirectories={false} />

      <Form.Dropdown id="action" title="Action" defaultValue="extract-tasks">
        <Form.Dropdown.Item value="extract-tasks" title="Extract Tasks & Create Reminders" icon={Icon.CheckCircle} />
        <Form.Dropdown.Item value="summarize" title="Summarize PDF" icon={Icon.Document} />
        <Form.Dropdown.Item value="custom" title="Custom Prompt" icon={Icon.Pencil} />
      </Form.Dropdown>

      <Form.TextArea
        id="customPrompt"
        title="Custom Prompt"
        placeholder="Enter your custom prompt (only used with Custom Prompt action)"
        enableMarkdown={false}
      />

      <Form.Description
        title="Instructions"
        text="Copy PDF file(s) in Finder (⌘C) or select files above. Choose an action and submit to process."
      />
    </Form>
  );
}
