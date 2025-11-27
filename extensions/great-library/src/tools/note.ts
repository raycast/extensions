import { randomUUID } from "node:crypto";
import { writeFile, unlink, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MAX_FILE_SIZE_BYTES, findOversizedFile, uploadFilesToLibrary, UploadableFile } from "../lib/upload";
import { formatErrorMessage } from "../utils/ui-helpers";
import type { UploadStatus } from "../lib/types";

type NoteToolInput = {
  /**
   * Optional title that will be used as the document display name.
   */
  title?: string;
  /**
   * Body of the note to store in the Great Library.
   */
  content: string;
};

type NoteToolResult = {
  /**
   * ID of the stored note document.
   */
  noteId: string;
  /**
   * Title associated with the stored note.
   */
  title: string;
  /**
   * Size of the uploaded document in bytes.
   */
  size: number;
  /**
   * Upload status reported by the Great Library cache.
   */
  status: UploadStatus;
  /**
   * Success indicator
   */
  success: boolean;
  /**
   * Error message if failed
   */
  error?: string;
};

/**
 * Create a note document and upload it to the Great Library.
 * This is the AI tool interface for Raycast AI to create and store notes.
 */
export default async function noteTool(input: NoteToolInput): Promise<NoteToolResult> {
  // Validate input
  const trimmedContent = input?.content?.trim();
  if (!trimmedContent) {
    return {
      noteId: "",
      title: "",
      size: 0,
      status: "error",
      success: false,
      error: "Provide the note content to upload.",
    };
  }

  // Prepare note metadata
  const title = input?.title?.trim() || "Untitled Note";
  const slug = buildSlug(title);
  const uniqueId = randomUUID().split("-")[0];
  const fileName = `${slug}-${uniqueId}.md`;
  const filePath = join(tmpdir(), fileName);
  const fileContents = formatNoteContent(title, trimmedContent);
  const estimatedSize = Buffer.byteLength(fileContents, "utf8");

  console.log("[noteTool] Creating note", {
    title,
    fileName,
    estimatedSize,
  });

  // Validate size before writing
  if (estimatedSize > MAX_FILE_SIZE_BYTES) {
    const maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
    return {
      noteId: "",
      title,
      size: estimatedSize,
      status: "error",
      success: false,
      error: `Note content exceeds the ${maxSizeMB} MB limit enforced by Google File Search.`,
    };
  }

  // Write temporary file
  let tempFileCreated = false;
  try {
    await writeFile(filePath, fileContents, "utf8");
    tempFileCreated = true;

    const fileStats = await stat(filePath);
    const uploadable: UploadableFile = {
      path: filePath,
      name: title,
      size: fileStats.size,
      mimeType: "text/markdown",
    };

    // Double-check size after writing
    const oversizeFile = findOversizedFile([uploadable]);
    if (oversizeFile) {
      const maxSizeMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
      throw new Error(`${oversizeFile.name} exceeds the ${maxSizeMB} MB limit enforced by Google File Search.`);
    }

    console.log("[noteTool] Uploading note", {
      path: filePath,
      size: fileStats.size,
    });

    // Upload the note
    const { documents } = await uploadFilesToLibrary([uploadable], {
      onProgressUpdate: (file) => {
        console.log("[noteTool] Upload progress", { file: file.name });
      },
    });

    const [document] = documents;
    if (!document) {
      throw new Error("The note was not stored successfully.");
    }

    console.log("[noteTool] Note uploaded successfully", {
      noteId: document.id,
      status: document.status,
    });

    return {
      noteId: document.id,
      title: document.name,
      size: document.size,
      status: document.status,
      success: true,
    };
  } catch (error) {
    const errorMessage = formatErrorMessage(error);
    console.error("[noteTool] Failed to upload note", error);

    return {
      noteId: "",
      title,
      size: estimatedSize,
      status: "error",
      success: false,
      error: errorMessage,
    };
  } finally {
    // Clean up temporary file
    if (tempFileCreated) {
      await unlink(filePath).catch((error) => {
        console.error("[noteTool] Failed to clean up temp file", { filePath, error });
      });
    }
  }
}

/**
 * Build a URL-safe slug from a title
 */
function buildSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return slug || "note";
}

/**
 * Format note content with optional title as markdown header
 */
function formatNoteContent(title: string, content: string): string {
  if (!title || title === "Untitled Note") {
    return `${content}\n`;
  }
  return `# ${title}\n\n${content}\n`;
}
