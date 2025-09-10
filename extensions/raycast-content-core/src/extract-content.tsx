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
  extractContent,
  checkUvxAvailable,
  isValidUrl,
  validateFile,
  isSupportedFile,
} from "./utils/content-core";
import { ContentResult } from "./utils/types";

interface FormValues {
  source: string;
  format: string;
}

function ExtractContentForm() {
  const [sourceError, setSourceError] = useState<string | undefined>();
  const [detectedType, setDetectedType] = useState<"url" | "file" | "unknown">(
    "unknown",
  );
  const { push } = useNavigation();

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
    const result = await extractContent({
      source: values.source,
      sourceType,
      format: values.format as "text" | "json" | "xml",
    });

    // Navigate to results
    push(<ResultsView result={result} sourceType={sourceType} />);
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
        return "Will extract content from the web page";
      case "file":
        return "Will extract content from the local file";
      case "unknown":
        return "Enter a URL or file path to auto-detect";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Extract Content" onSubmit={handleSubmit} />
          <Action
            title="Choose File"
            onAction={async () => {
              await open("file:///");
            }}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.OpenInBrowser
            title="Get Firecrawl Api Key"
            url="https://www.firecrawl.dev/"
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.OpenInBrowser
            title="Get Openai Api Key"
            url="https://platform.openai.com/api-keys"
            shortcut={{ modifiers: ["cmd"], key: "a" }}
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

      <Form.Dropdown id="format" title="Output Format" defaultValue="text">
        <Form.Dropdown.Item value="text" title="Plain Text" icon="📄" />
        <Form.Dropdown.Item value="json" title="JSON" icon="📋" />
        <Form.Dropdown.Item value="xml" title="XML" icon="📊" />
      </Form.Dropdown>

      <Form.Description
        title={`Detected: ${detectedType.charAt(0).toUpperCase() + detectedType.slice(1)} ${getSourceTypeIcon()}`}
        text={`${getSourceTypeDescription()}

Supported Sources:
• URLs: Any web page or article
• Documents: PDF, Word, PowerPoint, Excel, Text, Markdown, HTML, EPUB
• Media: MP4, AVI, MOV, MP3, WAV, M4A (requires OpenAI API key)
• Images: JPG, PNG, TIFF (OCR text extraction)
• Archives: ZIP, TAR, GZ

Content Core automatically selects the best extraction method for your input.`}
      />
    </Form>
  );
}

function ResultsView({
  result,
  sourceType,
}: {
  result: ContentResult;
  sourceType: string;
}) {
  const sourceDisplay = sourceType === "url" ? "URL" : "File";
  const sourceName =
    result.metadata?.source?.split("/").pop() || result.metadata?.source || "";

  const markdown = result.success
    ? `# Content Extraction Results

**Source Type:** ${sourceDisplay}  
**Source:** ${sourceName}  
**Extraction Time:** ${result.metadata?.extractionTime?.toFixed(1)}s  
**Content Length:** ${result.metadata?.contentLength?.toLocaleString()} characters

---

${result.content}`
    : `# Extraction Failed

**Source Type:** ${sourceDisplay}  
**Source:** ${sourceName}  
**Error:** ${result.error}

**Troubleshooting:**
${
  sourceType === "url"
    ? `
- Check if the URL is accessible
- Some sites may require a Firecrawl API key for proper extraction
- Ensure you have an OpenAI API key for complex content processing`
    : `
- Verify the file exists and is readable
- For audio/video files, make sure you have an OpenAI API key configured
- Check that the file format is supported by Content Core`
}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Content"
            content={result.content}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.Paste
            title="Paste Content"
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
            <Action.CreateSnippet
              title="Save as Snippet"
              snippet={{
                text: result.content,
                name: `Extracted: ${sourceName}`,
                keyword: `extract-${sourceName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
              }}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
        </ActionPanel>
      }
      metadata={
        result.success ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Source Type" text={sourceDisplay} />
            <Detail.Metadata.Label
              title="Source"
              text={result.metadata?.source || ""}
            />
            <Detail.Metadata.Label
              title="Extraction Time"
              text={`${result.metadata?.extractionTime?.toFixed(1)}s`}
            />
            <Detail.Metadata.Label
              title="Content Length"
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
  return <ExtractContentForm />;
}
