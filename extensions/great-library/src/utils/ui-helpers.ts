/**
 * UI helper functions for consistent user experience across commands
 */

import { Clipboard, Color, showToast, Toast } from "@raycast/api";
import { QaEntry } from "../hooks/useAskQuestion";
import { CitationEntry } from "../lib/ask";
import type { UploadStatus } from "../lib/types";

/**
 * Get status accessory for document status display
 */
export function getStatusAccessory(status: UploadStatus) {
  switch (status) {
    case "indexed":
      return { tag: { value: "Indexed", color: Color.Green } };
    case "processing":
    case "uploading":
      return { tag: { value: "Processing", color: Color.Yellow } };
    case "error":
      return { tag: { value: "Error", color: Color.Red } };
    default:
      return { tag: { value: "Pending", color: Color.SecondaryText } };
  }
}

/**
 * Get markdown content for a QA entry
 */
export function getEntryMarkdown(entry: QaEntry): string {
  if (entry.status === "pending") {
    return "_Searching documents..._";
  }
  if (entry.status === "error") {
    return `⚠️ ${entry.error ?? "Something went wrong."}`;
  }
  return entry.answer ?? "_No answer provided._";
}

/**
 * Copy QA entry answer to clipboard
 */
export async function copyEntryAnswer(entry: QaEntry): Promise<void> {
  if (!entry.answer) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No answer to copy",
    });
    return;
  }

  await Clipboard.copy(entry.answer);
  await showToast({
    style: Toast.Style.Success,
    title: "Answer copied",
  });
}

/**
 * Copy QA entry citations to clipboard in formatted text
 */
export async function copyEntryCitations(citations: CitationEntry[]): Promise<void> {
  if (!citations.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No citations to copy",
    });
    return;
  }

  const payload = citations
    .map((citation, index) => {
      const lines = [`${index + 1}. ${citation.documentName}${citation.documentId ? ` (${citation.documentId})` : ""}`];

      if (citation.snippet) {
        lines.push(`   "${citation.snippet}"`);
      }

      if (citation.uri) {
        lines.push(`   ${citation.uri}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");

  await Clipboard.copy(payload);
  await showToast({
    style: Toast.Style.Success,
    title: "Citations copied",
  });
}

/**
 * Format error message consistently
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Create a toast helper for async operations
 */
export interface ToastOptions {
  title: string;
  message?: string;
}

export class ToastManager {
  private toast: Toast | null = null;

  async showLoading(options: ToastOptions): Promise<void> {
    this.toast = await showToast({
      style: Toast.Style.Animated,
      title: options.title,
      message: options.message,
    });
  }

  async showSuccess(options: ToastOptions): Promise<void> {
    if (this.toast) {
      this.toast.style = Toast.Style.Success;
      this.toast.title = options.title;
      if (options.message) {
        this.toast.message = options.message;
      }
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: options.title,
        message: options.message,
      });
    }
  }

  async showError(options: ToastOptions & { error?: unknown }): Promise<void> {
    const message = options.message ?? (options.error ? formatErrorMessage(options.error) : undefined);

    if (this.toast) {
      this.toast.style = Toast.Style.Failure;
      this.toast.title = options.title;
      if (message) {
        this.toast.message = message;
      }
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: options.title,
        message,
      });
    }
  }

  updateMessage(message: string): void {
    if (this.toast) {
      this.toast.message = message;
    }
  }
}
