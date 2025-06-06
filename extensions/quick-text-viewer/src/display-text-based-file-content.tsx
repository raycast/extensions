import { Action, ActionPanel, Detail, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs/promises";
import path from "path";

export default function Command() {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const items = await getSelectedFinderItems();
        if (!items.length) {
          setError("No file selected in Finder");
          return;
        }
        const filePath = items[0].path;

        // Read only first 10KB of the file
        const fileHandle = await fs.open(filePath, "r");
        const maxSize = 10 * 1024; // 10KB
        const buffer = Buffer.alloc(maxSize);
        const { bytesRead } = await fileHandle.read(buffer, 0, maxSize, 0);
        await fileHandle.close();

        const text = buffer.subarray(0, bytesRead).toString("utf-8");

        if (!isTextFile(text)) {
          setError("File is not a text-based file");
          return;
        }

        // Check if file was truncated
        const stats = await fs.stat(filePath);
        const isTruncated = stats.size > maxSize;
        const finalContent = isTruncated
          ? `${text}\n\n--- File truncated (showing first 10KB of ${(stats.size / 1024).toFixed(1)}KB) ---`
          : text;

        setContent(finalContent);
        setFilePath(filePath);
      } catch (e: unknown) {
        const error = e as Error;
        setError("Failed to read file as text: " + error.message);
        showToast(Toast.Style.Failure, "Failed to read file", error.message);
      }
    })();
  }, []);

  if (error) {
    return <Detail markdown={`❌ ${error}`} />;
  }
  if (content === null) {
    return <Detail isLoading={true} markdown="Reading file..." />;
  }
  return (
    <Detail
      navigationTitle={filePath ? path.basename(filePath) : ""}
      markdown={filePath && path.extname(filePath).toLowerCase() === ".md" ? content : `\`\`\`\n${content}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Content" content={content} />
        </ActionPanel>
      }
    />
  );
}

function isTextFile(content: string): boolean {
  if (content.length === 0) return true;

  let printableCount = 0;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);

    if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) {
      printableCount++;
    }
  }

  const ratio = printableCount / content.length;
  return ratio > 0.75;
}
