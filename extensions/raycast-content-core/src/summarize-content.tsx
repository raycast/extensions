import React, { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  Detail,
  useNavigation,
  showToast,
  Toast,
  open,
} from "@raycast/api";
import {
  summarizeContent,
  checkUvxAvailable,
  isValidUrl,
  validateFile,
  isSupportedFile,
} from "./utils/content-core";
import { ContentResult } from "./utils/types";

interface FormValues {
  source: string;
  context: string;
}

function SummarizeContentForm() {
  const [sourceError, setSourceError] = useState<string | undefined>();
  const [detectedType, setDetectedType] = useState<"url" | "file" | "unknown">(
    "unknown",
  );
  const { push } = useNavigation();

  // Predefined context options
  const contextOptions = [
    {
      value: "",
      title: "General Summary",
      description: "Standard summary of the content",
    },
    {
      value: "bullet points",
      title: "Bullet Points",
      description: "Key points in bullet format",
    },
    {
      value: "executive summary",
      title: "Executive Summary",
      description: "Brief overview for decision makers",
    },
    {
      value: "key takeaways",
      title: "Key Takeaways",
      description: "Main insights and conclusions",
    },
    {
      value: "research summary",
      title: "Research Summary",
      description: "Academic paper or research summary",
    },
    {
      value: "meeting notes",
      title: "Meeting Notes",
      description: "Extract action items and decisions",
    },
    {
      value: "technical summary",
      title: "Technical Summary",
      description: "Focus on technical details and specs",
    },
    {
      value: "explain to a child",
      title: "Simple Explanation",
      description: "Easy to understand summary",
    },
    {
      value: "action items",
      title: "Action Items",
      description: "Actionable tasks and next steps",
    },
  ];

  function detectSourceType(source: string) {
    if (!source.trim()) {
      setDetectedType("unknown");
      return;
    }

    if (isValidUrl(source)) {
      setDetectedType("url");
      setSourceError(undefined);
    } else if (validateFile(source).valid && isSupportedFile(source)) {
      setDetectedType("file");
      setSourceError(undefined);
    } else {
      setDetectedType("unknown");
      setSourceError("Please enter a valid URL or file path");
    }
  }

  async function handleSubmit(values: FormValues) {
    const sourceType = detectedType;

    // Validate input
    if (!values.source.trim()) {
      setSourceError("Source is required");
      return;
    }

    if (sourceType === "unknown") {
      setSourceError("Please enter a valid URL or file path");
      return;
    }

    // Additional validation based on detected type
    if (sourceType === "url" && !isValidUrl(values.source)) {
      setSourceError("Please enter a valid URL");
      return;
    } else if (sourceType === "file") {
      const validation = validateFile(values.source);
      if (!validation.valid) {
        setSourceError(validation.error);
        return;
      }
      if (!isSupportedFile(values.source)) {
        setSourceError("File type not supported");
        return;
      }
    }

    // Check if uvx is available
    if (!checkUvxAvailable()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "uvx not found",
        message:
          "Please install uv first: curl -LsSf https://astral.sh/uv/install.sh | sh",
      });
      return;
    }

    setSourceError(undefined);

    // Process the content
    const result = await summarizeContent({
      source: values.source,
      sourceType,
      context: values.context || undefined,
    });

    // Navigate to results
    push(
      <ResultsView
        result={result}
        context={values.context}
        sourceType={sourceType}
      />,
    );
  }

  function getContextIcon(context: string): string {
    switch (context) {
      case "bullet points":
        return "•";
      case "executive summary":
        return "💼";
      case "key takeaways":
        return "🎯";
      case "research summary":
        return "🔬";
      case "meeting notes":
        return "📝";
      case "technical summary":
        return "⚙️";
      case "explain to a child":
        return "👶";
      case "action items":
        return "✅";
      default:
        return "📄";
    }
  }

  function getSourceTypeIcon(): string {
    switch (detectedType) {
      case "url":
        return "🌐";
      case "file":
        return "📄";
      case "unknown":
        return "❓";
    }
  }

  function getSourceTypeDescription(): string {
    switch (detectedType) {
      case "url":
        return "Will summarize content from the web page";
      case "file":
        return "Will summarize content from the local file";
      case "unknown":
        return "Enter a URL or file path to auto-detect";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Summary" onSubmit={handleSubmit} />
          <Action
            title="Choose File"
            onAction={async () => {
              await open("file:///");
            }}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.OpenInBrowser
            title="Get Openai Api Key"
            url="https://platform.openai.com/api-keys"
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.OpenInBrowser
            title="Get Firecrawl Api Key"
            url="https://www.firecrawl.dev/"
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="source"
        title="URL or File Path"
        placeholder="https://example.com or /path/to/file.pdf"
        error={sourceError}
        onChange={(value) => {
          setSourceError(undefined);
          detectSourceType(value);
        }}
        info="Enter any URL or file path - Content Core will auto-detect the type"
      />

      <Form.Dropdown id="context" title="Summary Style" defaultValue="">
        {contextOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
            icon={getContextIcon(option.value)}
          />
        ))}
      </Form.Dropdown>

      <Form.Description
        title={`Detected: ${detectedType.charAt(0).toUpperCase() + detectedType.slice(1)} ${getSourceTypeIcon()}`}
        text={`${getSourceTypeDescription()}

Supported Sources:
• URLs: Any web page or article  
• Documents: PDF, Word, PowerPoint, Excel, Text, Markdown, HTML, EPUB
• Media: MP4, AVI, MOV, MP3, WAV, M4A (transcript summaries)
• Images: JPG, PNG, TIFF (OCR then summarize)
• Archives: ZIP, TAR, GZ (extract and summarize contents)

Content Core will extract content and generate an AI-powered summary based on your selected style.`}
      />
    </Form>
  );
}

function ResultsView({
  result,
  context,
  sourceType,
}: {
  result: ContentResult;
  context: string;
  sourceType: string;
}) {
  const contextDisplay = context || "General Summary";
  const sourceDisplay = sourceType === "url" ? "URL" : "File";
  const sourceName =
    result.metadata?.source?.split("/").pop() || result.metadata?.source || "";

  const markdown = result.success
    ? `# ${contextDisplay}

**Source Type:** ${sourceDisplay}  
**Source:** ${sourceName}  
**Processing Time:** ${result.metadata?.extractionTime?.toFixed(1)}s  
**Summary Length:** ${result.metadata?.contentLength?.toLocaleString()} characters

---

${result.content}`
    : `# Summarization Failed

**Source Type:** ${sourceDisplay}  
**Source:** ${sourceName}  
**Error:** ${result.error}

**Common Issues:**
${
  sourceType === "url"
    ? `- The webpage might be behind a paywall or login
- Content might be heavily JavaScript-dependent
- The URL might not be accessible
- API rate limits might have been exceeded`
    : `- File might be corrupted or unreadable
- For media files, ensure you have an OpenAI API key configured
- Large files might timeout (try smaller files first)
- Some file formats might require additional dependencies`
}

**Solutions:**
${
  sourceType === "url"
    ? `- Try with a Firecrawl API key for better web scraping
- Ensure you have an OpenAI API key for AI summarization
- Check if the URL is publicly accessible`
    : `- Check file permissions and accessibility
- Configure required API keys in preferences
- Try with a smaller or different file format`
}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Summary"
            content={result.content}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.Paste
            title="Paste Summary"
            content={result.content}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
          />
          {sourceType === "url" ? (
            <Action.OpenInBrowser
              title="Open Original URL"
              url={result.metadata?.source || ""}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          ) : (
            <>
              <Action.OpenWith
                title="Open Original File"
                path={result.metadata?.source || ""}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              <Action.ShowInFinder
                title="Show in Finder"
                path={result.metadata?.source || ""}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            </>
          )}
          {result.success && (
            <>
              <Action.CreateSnippet
                title="Save as Snippet"
                snippet={{
                  text: result.content,
                  name: `Summary: ${sourceName}`,
                  keyword: `summary-${sourceName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                }}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
              <Action.CreateQuicklink
                title="Create Quicklink"
                quicklink={{
                  link:
                    sourceType === "url"
                      ? result.metadata?.source || ""
                      : `file://${result.metadata?.source}`,
                  name: `Summary: ${sourceName}`,
                }}
                shortcut={{ modifiers: ["cmd"], key: "q" }}
              />
            </>
          )}
        </ActionPanel>
      }
      metadata={
        result.success ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Source Type" text={sourceDisplay} />
            <Detail.Metadata.Label
              title="Summary Style"
              text={contextDisplay}
            />
            <Detail.Metadata.Label
              title="Source"
              text={result.metadata?.source || ""}
            />
            <Detail.Metadata.Label
              title="Processing Time"
              text={`${result.metadata?.extractionTime?.toFixed(1)}s`}
            />
            <Detail.Metadata.Label
              title="Summary Length"
              text={`${result.metadata?.contentLength?.toLocaleString()} characters`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Tip"
              text="Use Cmd+C to copy or Cmd+S to save as snippet"
            />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

export default function Command() {
  return <SummarizeContentForm />;
}
