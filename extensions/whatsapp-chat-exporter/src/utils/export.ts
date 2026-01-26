import fs from "fs-extra";
import path from "path";
import { Chat, Message, ExportFormat, MediaType } from "../types";

/**
 * Copies a single media file to the export directory
 * @returns The relative path to the copied file, or null if copy failed
 */
async function copyMediaFile(
  mediaBasePath: string,
  mediaRelativePath: string,
  exportDir: string,
  mediaSubdir: string,
): Promise<string | null> {
  try {
    // Validate path
    if (!mediaRelativePath || mediaRelativePath.trim() === "") {
      return null;
    }

    const sourcePath = path.join(mediaBasePath, mediaRelativePath);

    // Check if source file exists
    if (!(await fs.pathExists(sourcePath))) {
      console.warn(`Media file not found: ${sourcePath}`);
      return null;
    }

    // Check if it's a file (not directory)
    const stats = await fs.stat(sourcePath);
    if (!stats.isFile()) {
      console.warn(`Path is not a file: ${sourcePath}`);
      return null;
    }

    // Extract original filename and extension
    const originalName = path.basename(mediaRelativePath);
    const ext = path.extname(originalName);
    const timestamp = Date.now();

    // Create unique filename to avoid collisions
    const fileName = `${path.basename(originalName, ext)}_${timestamp}${ext}`;

    // Create media subdirectory
    const mediaDir = path.join(exportDir, mediaSubdir);
    await fs.ensureDir(mediaDir);

    // Destination path
    const destPath = path.join(mediaDir, fileName);

    // Copy file
    await fs.copyFile(sourcePath, destPath);

    // Return relative path for embedding in exports
    return path.join(mediaSubdir, fileName);
  } catch (error) {
    // Specific error handling
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EACCES") {
      console.error(`Permission denied: ${mediaRelativePath}`);
    } else if (err.code === "ENOSPC") {
      console.error(`No space left on device`);
      throw error; // Re-throw to stop further copies
    } else {
      console.error(`Failed to copy ${mediaRelativePath}:`, error);
    }
    return null;
  }
}

/**
 * Processes all media files for a chat, copying them to export directory
 * @returns Map of message ID to exported media paths
 */
async function processMediaFiles(
  messages: Message[],
  mediaBasePath: string,
  exportDir: string,
  chatSafeName: string,
): Promise<Map<string, { media?: string; thumbnail?: string }>> {
  const mediaMap = new Map<string, { media?: string; thumbnail?: string }>();
  const mediaSubdir = `${chatSafeName}_media`;

  for (const message of messages) {
    if (!message.hasMedia || !message.mediaInfo) continue;

    const paths: { media?: string; thumbnail?: string } = {};

    // Copy main media file
    if (message.mediaInfo.localPath) {
      const copiedPath = await copyMediaFile(
        mediaBasePath,
        message.mediaInfo.localPath,
        exportDir,
        mediaSubdir,
      );
      if (copiedPath) {
        paths.media = copiedPath;
        message.mediaInfo.exportedPath = copiedPath;
        message.mediaInfo.isAvailable = true;
      }
    }

    // Copy thumbnail if exists
    if (message.mediaInfo.thumbnailPath) {
      const copiedThumbPath = await copyMediaFile(
        mediaBasePath,
        message.mediaInfo.thumbnailPath,
        exportDir,
        `${mediaSubdir}/thumbnails`,
      );
      if (copiedThumbPath) {
        paths.thumbnail = copiedThumbPath;
        message.mediaInfo.exportedThumbnailPath = copiedThumbPath;
      }
    }

    if (paths.media || paths.thumbnail) {
      mediaMap.set(message.id, paths);
    }
  }

  return mediaMap;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function generateJSONExport(
  chat: Chat,
  messages: Message[],
  _mediaMap: Map<string, { media?: string; thumbnail?: string }> | null,
): string {
  const data = {
    chat: {
      name: chat.name,
      exportedAt: new Date().toISOString(),
    },
    messages: messages.map((m) => {
      const msgData: Record<string, unknown> = {
        date: new Date(m.date).toISOString(),
        sender: m.isFromMe ? "Me" : m.senderName || chat.name,
        text: m.text,
        hasMedia: m.hasMedia,
      };

      // Include media information if available
      if (m.hasMedia && m.mediaInfo) {
        msgData.media = {
          type: m.mediaInfo.mediaType,
          fileSize: m.mediaInfo.fileSize,
          title: m.mediaInfo.title,
          duration: m.mediaInfo.duration,
          isAvailable: m.mediaInfo.isAvailable,
          exportedPath: m.mediaInfo.exportedPath,
          thumbnailPath: m.mediaInfo.exportedThumbnailPath,
          originalUrl: m.mediaInfo.url,
        };
      }

      return msgData;
    }),
  };

  return JSON.stringify(data, null, 2);
}

function generateMarkdownExport(
  chat: Chat,
  messages: Message[],
  mediaMap: Map<string, { media?: string; thumbnail?: string }> | null,
): string {
  let content = `# Chat with ${chat.name}\n\n`;
  content += `*Exported on ${new Date().toLocaleString()}*\n\n`;

  if (mediaMap && mediaMap.size > 0) {
    content += `*This export includes ${mediaMap.size} media files*\n\n`;
    content += `---\n\n`;
  }

  messages.forEach((msg) => {
    const dateStr = new Date(msg.date).toLocaleString();
    const sender = msg.isFromMe ? "Me" : msg.senderName || chat.name;
    let text = msg.text || "";

    // Handle media
    if (msg.hasMedia && msg.mediaInfo) {
      const mediaInfo = msg.mediaInfo;

      if (mediaInfo.exportedPath) {
        // Media file was successfully copied
        switch (mediaInfo.mediaType) {
          case MediaType.IMAGE:
            // Use markdown image syntax
            text += `\n\n![${mediaInfo.title || "Image"}](${mediaInfo.exportedPath})`;
            if (mediaInfo.fileSize) {
              text += `\n*Size: ${formatFileSize(mediaInfo.fileSize)}*`;
            }
            break;

          case MediaType.VIDEO:
            text += `\n\n**[Video]** [${mediaInfo.title || "Video"}](${mediaInfo.exportedPath})`;
            if (mediaInfo.duration) {
              text += ` (Duration: ${formatDuration(mediaInfo.duration)})`;
            }
            if (mediaInfo.fileSize) {
              text += `\n*Size: ${formatFileSize(mediaInfo.fileSize)}*`;
            }
            break;

          case MediaType.AUDIO:
            text += `\n\n**[Audio]** [${mediaInfo.title || "Audio"}](${mediaInfo.exportedPath})`;
            if (mediaInfo.duration) {
              text += ` (Duration: ${formatDuration(mediaInfo.duration)})`;
            }
            break;

          case MediaType.DOCUMENT:
            text += `\n\n**[Document]** [${mediaInfo.title || "Document"}](${mediaInfo.exportedPath})`;
            if (mediaInfo.fileSize) {
              text += `\n*Size: ${formatFileSize(mediaInfo.fileSize)}*`;
            }
            break;

          case MediaType.VCARD:
            text += `\n\n**[Contact]** ${mediaInfo.title || "Contact Card"}`;
            break;

          default:
            text += `\n\n**[File]** [${mediaInfo.title || "Attachment"}](${mediaInfo.exportedPath})`;
        }
      } else {
        // Media not available or cloud-only
        text += `\n\n*[Media: ${mediaInfo.mediaType}`;
        if (mediaInfo.title) text += ` - ${mediaInfo.title}`;
        if (!mediaInfo.isAvailable) text += ` - Not downloaded`;
        text += `]*`;
      }
    } else if (msg.hasMedia && !msg.mediaInfo) {
      // Old-style media detection
      text = text || "*[Media Attachment]*";
    }

    if (!text) {
      text = "*[Empty Message]*";
    }

    content += `**${sender}** [${dateStr}]:\n${text}\n\n`;
  });

  return content;
}

export async function exportChat(
  chat: Chat,
  messages: Message[],
  destination: string,
  format: ExportFormat,
  includeMedia: boolean,
  mediaBasePath?: string,
): Promise<string> {
  // Sanitize filename
  const safeName = chat.name.replace(/[^a-z0-9]/gi, "_").trim();
  const fileName = `WhatsApp_Chat_${safeName}_${Date.now()}`;
  const outDir = path.resolve(destination);

  await fs.ensureDir(outDir);

  // Process media files if requested
  let mediaMap: Map<string, { media?: string; thumbnail?: string }> | null =
    null;
  if (includeMedia && mediaBasePath) {
    try {
      mediaMap = await processMediaFiles(
        messages,
        mediaBasePath,
        outDir,
        safeName,
      );
      console.log(`Copied ${mediaMap.size} media files for ${chat.name}`);
    } catch (error) {
      console.error(`Error processing media files:`, error);
      // Continue with export even if media copy fails
    }
  }

  let content = "";
  let extension = "";

  if (format === "json") {
    content = generateJSONExport(chat, messages, mediaMap);
    extension = "json";
  } else {
    content = generateMarkdownExport(chat, messages, mediaMap);
    extension = "md";
  }

  const filePath = path.join(outDir, `${fileName}.${extension}`);
  await fs.writeFile(filePath, content, "utf-8");

  return filePath;
}
