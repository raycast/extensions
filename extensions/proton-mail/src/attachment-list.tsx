import { List, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { homedir } from "os";
import { join, basename, extname } from "path";
import { writeFile, mkdir, access } from "fs/promises";
import { fetchAttachments, Attachment } from "./imap-client";

// Sanitize filename to prevent path traversal attacks
function sanitizeFilename(filename: string): string {
  // Use basename to strip any directory components, then remove dangerous characters
  const base = basename(filename);
  // Remove or replace characters that could be problematic (control chars, path separators, etc.)
  // eslint-disable-next-line no-control-regex
  return base.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_") || "attachment";
}

// Check if a file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// Get a unique filename by appending (1), (2), etc. if file exists
async function getUniqueFilename(directory: string, filename: string): Promise<string> {
  const ext = extname(filename);
  const nameWithoutExt = ext ? filename.slice(0, -ext.length) : filename;

  let finalPath = join(directory, filename);
  let counter = 1;

  while (await fileExists(finalPath)) {
    const newFilename = `${nameWithoutExt} (${counter})${ext}`;
    finalPath = join(directory, newFilename);
    counter++;
  }

  return finalPath;
}

interface AttachmentListProps {
  folder: string;
  emailUid: number;
  emailSubject: string;
}

export function AttachmentList({ folder, emailUid, emailSubject }: AttachmentListProps) {
  const { pop } = useNavigation();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAttachments = async () => {
      try {
        const atts = await fetchAttachments(folder, emailUid);
        setAttachments(atts);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to load attachments", message: String(error) });
      } finally {
        setIsLoading(false);
      }
    };
    loadAttachments();
  }, [folder, emailUid]);

  const getTimestampedFolderName = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `proton-attachments-${year}${month}${day}T${hours}${minutes}${seconds}`;
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const safeFilename = sanitizeFilename(attachment.filename);
      showToast({ style: Toast.Style.Animated, title: `Downloading ${safeFilename}...` });

      // Single file goes directly to Downloads, with unique filename if exists
      const downloadsDir = join(homedir(), "Downloads");
      const filePath = await getUniqueFilename(downloadsDir, safeFilename);
      await writeFile(filePath, attachment.content);

      const savedFilename = basename(filePath);
      showToast({
        style: Toast.Style.Success,
        title: "Downloaded",
        message: `Saved to ~/Downloads/${savedFilename}`,
      });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to download", message: String(error) });
    }
  };

  const downloadAllAttachments = async () => {
    try {
      showToast({ style: Toast.Style.Animated, title: "Downloading all attachments..." });

      // Multiple files go to a timestamped folder
      const folderName = getTimestampedFolderName();
      const downloadsDir = join(homedir(), "Downloads", folderName);
      await mkdir(downloadsDir, { recursive: true });

      for (const attachment of attachments) {
        const safeFilename = sanitizeFilename(attachment.filename);
        const filePath = join(downloadsDir, safeFilename);
        await writeFile(filePath, attachment.content);
      }

      showToast({
        style: Toast.Style.Success,
        title: `Downloaded ${attachments.length} attachment${attachments.length > 1 ? "s" : ""}`,
        message: `Saved to ~/Downloads/${folderName}`,
      });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to download", message: String(error) });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (contentType: string): Icon => {
    if (contentType.startsWith("image/")) return Icon.Image;
    if (contentType.startsWith("video/")) return Icon.Video;
    if (contentType.startsWith("audio/")) return Icon.Music;
    if (contentType.includes("pdf")) return Icon.Document;
    if (contentType.includes("zip") || contentType.includes("compressed")) return Icon.Box;
    if (contentType.includes("spreadsheet") || contentType.includes("excel")) return Icon.List;
    if (contentType.includes("document") || contentType.includes("word")) return Icon.TextDocument;
    return Icon.Paperclip;
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Attachments - ${emailSubject}`}
      searchBarPlaceholder="Search attachments..."
    >
      {attachments.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Paperclip} title="No Attachments" description="This email has no attachments" />
      ) : (
        <>
          {attachments.length > 1 && (
            <List.Item
              key="download-all"
              title="Download All Attachments"
              subtitle={`${attachments.length} files`}
              icon={Icon.Download}
              actions={
                <ActionPanel>
                  <Action title="Download All" icon={Icon.Download} onAction={downloadAllAttachments} />
                  <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
                </ActionPanel>
              }
            />
          )}
          {attachments.map((attachment, index) => (
            <List.Item
              key={index}
              title={attachment.filename}
              subtitle={formatFileSize(attachment.content.length)}
              icon={getFileIcon(attachment.contentType)}
              accessories={[{ text: attachment.contentType.split("/")[1]?.toUpperCase() || "FILE" }]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Download ${attachment.filename}`}
                    icon={Icon.Download}
                    onAction={() => downloadAttachment(attachment)}
                  />
                  {attachments.length > 1 && (
                    <Action
                      title="Download All Attachments"
                      icon={Icon.Download}
                      onAction={downloadAllAttachments}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                    />
                  )}
                  <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
