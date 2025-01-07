import { Form, ActionPanel, Action, showHUD, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { FileService, CONFIG } from "../utils";
import type { CapturedData } from "../utils";
import * as path from "node:path";
import * as fs from "node:fs/promises";

interface FormValues {
  comment: string;
}

interface CommentFormProps {
  data: CapturedData;
  filePath: string;
  onCommentSaved?: () => void;
}

export function CommentForm({ data, filePath, onCommentSaved }: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      const updatedData = {
        ...data,
        metadata: {
          ...data.metadata,
          comment: values.comment,
        },
      };

      // Save comment to original metadata file
      await FileService.saveJSON(filePath, updatedData);

      // If this is a screenshot (has a file path), copy it to capture directory
      if (data.content.screenshot?.startsWith("file://")) {
        const screenshotPath = data.content.screenshot.replace("file://", "");
        const timestamp = new Date().toISOString().replace(/:/g, "-");
        const newScreenshotName = `screenshot-${timestamp}.png`;
        const newScreenshotPath = path.join(CONFIG.saveDir, newScreenshotName);

        // Copy screenshot file
        await fs.copyFile(screenshotPath, newScreenshotPath);

        // Create capture data
        const captureData: CapturedData = {
          content: {
            text: null,
            html: null,
            screenshot: newScreenshotPath,
          },
          source: data.source,
          metadata: {
            timestamp: new Date().toISOString(),
            comment: values.comment,
          },
        };

        // Save capture data
        const jsonPath = path.join(CONFIG.saveDir, `screenshot-capture-${timestamp}.json`);
        await FileService.saveJSON(jsonPath, captureData);
      }

      await showHUD("✓ Added comment");
      onCommentSaved?.();
      await popToRoot();
    } catch (error) {
      console.error("Failed to save comment:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Save Comment",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Comment" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Add any notes about this capture..."
        defaultValue={data.metadata.comment}
        enableMarkdown
      />
      <Form.Description
        title="Capture Info"
        text={`${data.source.app || "Unknown"} - ${new Date(data.metadata.timestamp).toLocaleString()}`}
      />
    </Form>
  );
}
