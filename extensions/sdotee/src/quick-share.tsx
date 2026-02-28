import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Color,
  Clipboard,
  showToast,
  Toast,
  popToRoot,
  getSelectedFinderItems,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  createShortUrl,
  createText,
  uploadFile as apiUploadFile,
} from "./lib/api";
import {
  getDefaultUrlDomain,
  getDefaultTextDomain,
  getDefaultFileDomain,
} from "./lib/sdk";
import { addHistoryItem } from "./lib/history";
import { getShareableFileUrl } from "./lib/file-url";

import { readFileSync, existsSync, statSync } from "fs";
import { basename, extname } from "path";
import { fileURLToPath } from "url";

type ShareType = "url" | "text" | "file";

function resolveFilePath(path: string): string {
  if (path.startsWith("file://")) return fileURLToPath(path);
  try {
    return decodeURIComponent(path);
  } catch {
    // Keep original path when it contains raw '%' characters.
    return path;
  }
}

function detectType(text: string): ShareType {
  try {
    const url = new URL(text.trim());
    if (url.protocol === "http:" || url.protocol === "https:") return "url";
  } catch {
    // not a URL
  }
  const trimmed = text.trim();
  if (
    (trimmed.startsWith("/") || trimmed.startsWith("~")) &&
    existsSync(trimmed)
  )
    return "file";
  return "text";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeIcon(type: ShareType) {
  switch (type) {
    case "url":
      return { source: Icon.Link, tintColor: Color.Blue };
    case "file":
      return { source: Icon.Document, tintColor: Color.Orange };
    case "text":
      return { source: Icon.Text, tintColor: Color.Green };
  }
}

function typeLabel(type: ShareType): string {
  switch (type) {
    case "url":
      return "Short URL";
    case "file":
      return "File Upload";
    case "text":
      return "Text Share";
  }
}

function QuickShareCommand() {
  const [content, setContent] = useState("");
  const [type, setType] = useState<ShareType>("text");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const finderItems = await getSelectedFinderItems();
        if (finderItems.length > 0) {
          const resolved = resolveFilePath(finderItems[0].path);
          setFilePath(resolved);
          setContent(resolved);
          setType("file");
          setIsReady(true);
          return;
        }
      } catch {
        // No Finder selection
      }

      const clipboardContent = await Clipboard.read();
      if (clipboardContent.file) {
        const resolved = resolveFilePath(clipboardContent.file);
        setFilePath(resolved);
        setContent(resolved);
        setType("file");
        setIsReady(true);
        return;
      }

      if (clipboardContent.text && clipboardContent.text.trim().length > 0) {
        const text = clipboardContent.text.trim();
        setContent(text);
        const detected = detectType(text);
        setType(detected);
        if (detected === "file") setFilePath(text);
      }
      setIsReady(true);
    })();
  }, []);

  async function shareUrlOrFile() {
    setIsSharing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sharing...",
    });
    try {
      if (type === "url") {
        const domain = await getDefaultUrlDomain();
        if (!domain) throw new Error("No domain available");
        const res = await createShortUrl({ target_url: content, domain });
        await Clipboard.copy(res.data.short_url);
        await addHistoryItem({
          type: "url",
          title: content,
          url: res.data.short_url,
          domain,
          slug: res.data.slug,
          createdAt: new Date().toISOString(),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Short URL created";
        toast.message = `${res.data.short_url} copied`;
      } else {
        const path = filePath || content;
        const domain = await getDefaultFileDomain();
        const fileBuffer = readFileSync(path);
        const fileName = basename(path);
        const blob = new Blob([new Uint8Array(fileBuffer)]);
        const formData = new FormData();
        formData.append("file", blob, fileName);
        if (domain) formData.append("domain", domain);
        const res = await apiUploadFile(formData);
        const shortUrl = getShareableFileUrl(res.data, domain);
        await Clipboard.copy(shortUrl);
        await addHistoryItem({
          type: "file",
          title: fileName,
          url: shortUrl,
          domain: domain || new URL(shortUrl).hostname,
          slug: res.data.storename,
          hash: res.data.hash,
          fileUrl: res.data.url,
          createdAt: new Date().toISOString(),
        });
        toast.style = Toast.Style.Success;
        toast.title = "File uploaded";
        toast.message = `${shortUrl} copied`;
      }
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to share";
      toast.message = error instanceof Error ? error.message : String(error);
      setIsSharing(false);
    }
  }

  // Text type — show Form with required title
  if (isReady && type === "text" && content) {
    return <TextShareForm content={content} />;
  }

  // URL / File — show Detail preview
  function buildMarkdown(): string {
    if (!isReady) return "Loading clipboard...";
    if (!content)
      return "## Nothing to share\n\nClipboard is empty and no Finder file is selected.";

    const icon = type === "url" ? "🔗" : "📄";
    let md = `## ${icon} ${typeLabel(type)}\n\n---\n\n`;

    if (type === "url") {
      md += `**URL**\n\n\`${content}\`\n`;
    } else if (type === "file") {
      const path = filePath || content;
      const name = basename(path);
      const ext = extname(path).slice(1).toUpperCase() || "Unknown";
      try {
        const stats = statSync(path);
        md += `| | |\n|---|---|\n`;
        md += `| **File** | ${name} |\n`;
        md += `| **Type** | ${ext} |\n`;
        md += `| **Size** | ${formatFileSize(stats.size)} |\n`;
        md += `| **Path** | \`${path}\` |\n`;
      } catch {
        md += `**File**: ${name}\n`;
      }
    }
    return md;
  }

  return (
    <Detail
      isLoading={!isReady || isSharing}
      markdown={buildMarkdown()}
      metadata={
        isReady && content ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Type">
              <Detail.Metadata.TagList.Item
                text={typeLabel(type)}
                icon={typeIcon(type)}
                color={typeIcon(type).tintColor}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Separator />
            {type === "url" && (
              <Detail.Metadata.Link
                title="Target"
                target={content}
                text={new URL(content).hostname}
              />
            )}
            {type === "file" && (
              <Detail.Metadata.Label
                title="Filename"
                text={basename(filePath || content)}
              />
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        isReady && content ? (
          <ActionPanel>
            <Action
              title={`Share as ${typeLabel(type)}`}
              icon={typeIcon(type)}
              onAction={shareUrlOrFile}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function TextShareForm({ content }: { content: string }) {
  const [titleError, setTitleError] = useState<string | undefined>();
  const preview =
    content.length > 200 ? content.slice(0, 200) + "..." : content;

  async function handleSubmit(values: { title: string }) {
    if (!values.title.trim()) {
      setTitleError("Title is required");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating text share...",
    });
    try {
      const domain = await getDefaultTextDomain();
      const res = await createText({
        content,
        title: values.title,
        domain: domain || undefined,
      });
      await Clipboard.copy(res.data.short_url);
      await addHistoryItem({
        type: "text",
        title: values.title,
        url: res.data.short_url,
        domain: domain || new URL(res.data.short_url).hostname,
        slug: res.data.slug,
        createdAt: new Date().toISOString(),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Text shared";
      toast.message = `${res.data.short_url} copied to clipboard`;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create text share";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      navigationTitle="Quick Share - Text"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Share Text"
            icon={Icon.Text}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter a title"
        error={titleError}
        onChange={() => titleError && setTitleError(undefined)}
      />
      <Form.Separator />
      <Form.Description title="Content Preview" text={preview} />
      <Form.Description title="Length" text={`${content.length} characters`} />
    </Form>
  );
}

export default function QuickShare() {
  return <QuickShareCommand />;
}
