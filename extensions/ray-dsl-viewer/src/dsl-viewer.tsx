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

function detectContentType(content: string): ContentType {
  const trimmed = content.trim().toLowerCase();
  if (!trimmed) return "markdown";

  const firstWord = trimmed.split(/[\s\n]/)[0];
  return MERMAID_KEYWORDS.some((kw) => firstWord === kw.toLowerCase())
    ? "mermaid"
    : "markdown";
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
  return `https://mermaid.ink/img/${encodeBase64Url(codeWithTheme)}?bgColor=!1a1a1a`;
}

function processMermaidBlocks(markdown: string): string {
  const regex = new RegExp(MERMAID_BLOCK_PATTERN, "g");
  return markdown.replace(regex, (_, code: string) => {
    return `![Mermaid Diagram](${mermaidToImageUrl(code.trim())})`;
  });
}

function renderContent(contentType: ContentType, content: string): string {
  return contentType === "markdown"
    ? processMermaidBlocks(content)
    : `![Mermaid Diagram](${mermaidToImageUrl(content)})`;
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
    setDetectedType(detectContentType(content));
  }, [content]);

  const handlePaste = async () => {
    const text = await Clipboard.readText();
    if (!text) return;

    const detected = detectContentType(text);
    setContent(text);
    setContentType(detected);
    await showToast({
      style: Toast.Style.Success,
      title: `Detected as ${formatTypeLabel(detected)}`,
    });
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
        error={warningMessage}
      />
    </Form>
  );
}
