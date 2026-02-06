import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

type ContentType = "markdown" | "mermaid";

// ============================================================================
// Constants
// ============================================================================

const MERMAID_KEYWORDS = [
  "graph",
  "flowchart",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "mindmap",
  "timeline",
  "gitGraph",
  "C4Context",
  "C4Container",
  "C4Component",
  "C4Dynamic",
  "C4Deployment",
  "requirementDiagram",
  "%%{",
] as const;

const MERMAID_BLOCK_PATTERN = "```mermaid\\s*\\n([\\s\\S]*?)```";

const DARK_THEME_CONFIG = `%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#3b82f6',
  'primaryTextColor': '#ffffff',
  'primaryBorderColor': '#60a5fa',
  'lineColor': '#9ca3af',
  'secondaryColor': '#6366f1',
  'tertiaryColor': '#8b5cf6',
  'background': '#1a1a1a',
  'mainBkg': '#1a1a1a',
  'nodeBorder': '#60a5fa',
  'clusterBkg': '#262626',
  'titleColor': '#ffffff',
  'edgeLabelBackground': '#1a1a1a'
}}}%%\n`;

const PLACEHOLDERS: Record<ContentType, string> = {
  markdown: "# Hello\nEnter Markdown...",
  mermaid: "graph TD\n    A --> B",
};

// ============================================================================
// Utilities
// ============================================================================

function isMermaidBlock(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("%%{")) return true;
  const firstWord = trimmed.split(/[\s\n]/)[0].toLowerCase().replace(/-v\d+$/, "");
  return MERMAID_KEYWORDS.some((kw) => firstWord === kw.toLowerCase());
}

function hasMarkdownSyntax(content: string): boolean {
  return /(?:^|\n)\s*(?:#{1,6}\s|\*\*|__|- |\d+\. |> )/.test(content);
}

function detectContentType(content: string): ContentType {
  const trimmed = content.trim();
  if (!trimmed) return "markdown";
  if (hasMarkdownSyntax(trimmed)) return "markdown";
  return isMermaidBlock(trimmed) ? "mermaid" : "markdown";
}

function encodeBase64Url(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function mermaidToImageUrl(code: string): string {
  const codeWithTheme = code.startsWith("%%{")
    ? code
    : DARK_THEME_CONFIG + code;
  // Note: Using %21 instead of ! for URL encoding, and using proper hex color format
  return `https://mermaid.ink/img/${encodeBase64Url(codeWithTheme)}?bgColor=%231a1a1a`;
}

function processFencedMermaidBlocks(markdown: string): string {
  const regex = new RegExp(MERMAID_BLOCK_PATTERN, "g");
  return markdown.replace(regex, (_, code: string) => {
    return `![Mermaid Diagram](${mermaidToImageUrl(code.trim())})`;
  });
}

function processUnfencedMermaidBlocks(markdown: string): string {
  return markdown
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (isMermaidBlock(trimmed)) {
        return `![Mermaid Diagram](${mermaidToImageUrl(trimmed)})`;
      }
      return paragraph;
    })
    .join("\n\n");
}

function renderContent(contentType: ContentType, content: string): string {
  if (contentType === "mermaid") {
    return `![Mermaid Diagram](${mermaidToImageUrl(content)})`;
  }
  const result = processFencedMermaidBlocks(content);
  return processUnfencedMermaidBlocks(result);
}

function formatTypeLabel(type: ContentType): string {
  return type === "mermaid" ? "Mermaid" : "Markdown";
}

// ============================================================================
// Components
// ============================================================================

function PreviewDetail({
  contentType,
  content,
}: {
  contentType: ContentType;
  content: string;
}) {
  const { pop } = useNavigation();

  return (
    <Detail
      markdown={renderContent(contentType, content)}
      actions={
        <ActionPanel>
          <Action title="Back to Editor" onAction={pop} />
          <Action.CopyToClipboard title="Copy Content" content={content} />
        </ActionPanel>
      }
    />
  );
}

// ============================================================================
// Main Command
// ============================================================================

export default function Command() {
  const { push } = useNavigation();
  const [contentType, setContentType] = useState<ContentType>("markdown");
  const [content, setContent] = useState("");
  const [detectedType, setDetectedType] = useState<ContentType>("markdown");

  const hasContent = content.trim().length > 0;
  const isTypeMismatch = hasContent && contentType !== detectedType;

  useEffect(() => {
    const detected = detectContentType(content);
    setDetectedType(detected);
    if (content.trim().length > 0) {
      setContentType(detected);
    }
  }, [content]);

  const handlePaste = async () => {
    try {
      const text = await Clipboard.readText();
      console.log("Clipboard text:", text?.substring(0, 100));
      if (!text) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clipboard is empty",
        });
        return;
      }

      const detected = detectContentType(text);
      console.log("Detected type:", detected);
      setContent(text);
      setContentType(detected);
      await showToast({
        style: Toast.Style.Success,
        title: `Detected as ${formatTypeLabel(detected)}`,
      });
    } catch (error) {
      console.error("Paste error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to paste",
        message: String(error),
      });
    }
  };

  const handleSubmit = () => {
    if (!hasContent) return;

    if (isTypeMismatch) {
      showToast({
        style: Toast.Style.Animated,
        title: `Rendering as ${formatTypeLabel(contentType)}`,
        message: `Content looks like ${formatTypeLabel(detectedType)}`,
      });
    }

    push(<PreviewDetail contentType={contentType} content={content} />);
  };

  const warningMessage = isTypeMismatch
    ? `This looks like ${formatTypeLabel(detectedType)} code`
    : undefined;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview" onSubmit={handleSubmit} />
          <Action
            title="Paste from Clipboard"
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            onAction={handlePaste}
          />
          {isTypeMismatch && (
            <Action
              title={`Switch to ${formatTypeLabel(detectedType)}`}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              onAction={() => setContentType(detectedType)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="contentType"
        title="Type"
        value={contentType}
        onChange={(v) => setContentType(v as ContentType)}
        info={warningMessage}
      >
        <Form.Dropdown.Item value="markdown" title="Markdown" />
        <Form.Dropdown.Item value="mermaid" title="Mermaid" />
      </Form.Dropdown>
      <Form.TextArea
        id="content"
        title="Content"
        placeholder={PLACEHOLDERS[contentType]}
        value={content}
        onChange={setContent}
      />
    </Form>
  );
}
