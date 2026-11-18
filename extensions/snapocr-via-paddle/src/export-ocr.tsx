import { Action, ActionPanel, Detail, Form, Toast, getSelectedFinderItems, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getOCRFileType, recognizeFile } from "./api";
import { exportMarkdownBundle, type MarkdownBundleExport } from "./export-markdown";
import type { OCRResult } from "./types";

interface ExportFormValues {
  file: string[];
}

function buildSummaryMarkdown(sourcePath: string, result: OCRResult, exported: MarkdownBundleExport): string {
  const lines = [
    "## Export Complete",
    "",
    `**Source**: ${sourcePath}`,
    `**Pages**: ${exported.pageCount}`,
    `**Extracted images**: ${exported.imageCount}`,
    `**Markdown file**: ${exported.markdownPath}`,
    `**Bundle folder**: ${exported.bundlePath}`,
  ];

  if (result.text) {
    lines.push("", "## Markdown Preview", "", result.text.slice(0, 4000));
  }

  return lines.join("\n");
}

export default function Command() {
  const [selectedFile, setSelectedFile] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sourcePath, setSourcePath] = useState("");
  const [result, setResult] = useState<OCRResult | null>(null);
  const [exported, setExported] = useState<MarkdownBundleExport | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFinderSelection() {
      try {
        const items = await getSelectedFinderItems();
        const firstPath = items[0]?.path;
        if (!cancelled && firstPath) {
          setSelectedFile([firstPath]);
        }
      } catch {
        // Ignore when Finder is not frontmost.
      }
    }

    loadFinderSelection();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(values: ExportFormValues) {
    const filePath = values.file[0];

    if (!filePath) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a file to continue" });
      return;
    }

    try {
      getOCRFileType(filePath);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unsupported file type",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Recognizing document..." });

    try {
      const nextResult = await recognizeFile(filePath);
      toast.title = "Exporting Markdown bundle...";

      const nextExport = await exportMarkdownBundle(nextResult, filePath);
      toast.style = Toast.Style.Success;
      toast.title = "Markdown bundle exported";
      toast.message = nextExport.bundlePath;

      setSourcePath(filePath);
      setResult(nextResult);
      setExported(nextExport);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Export failed";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result && exported) {
    return (
      <Detail
        markdown={buildSummaryMarkdown(sourcePath, result, exported)}
        actions={
          <ActionPanel>
            <Action.Open title="Open Markdown File" target={exported.markdownPath} />
            <Action.ShowInFinder path={exported.bundlePath} />
            <Action.CopyToClipboard title="Copy Markdown Path" content={exported.markdownPath} />
            <Action
              title="Export Another File"
              onAction={() => {
                setExported(null);
                setResult(null);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export Markdown Bundle" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose a PDF or image file. The Markdown bundle will be exported into ~/Downloads/SnapOCR Exports." />
      <Form.FilePicker
        id="file"
        title="Document"
        value={selectedFile}
        onChange={setSelectedFile}
        allowMultipleSelection={false}
      />
    </Form>
  );
}
