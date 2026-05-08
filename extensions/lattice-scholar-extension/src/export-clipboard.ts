import { Clipboard, closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ExportFormat, Paper, formatPaperAsClipboardContent, getFormatTitle } from "./export-formats";

interface ExportPreferences {
  clipboardFontFamily?: string;
  clipboardFontSize?: string;
}

export async function copyFormattedPaper(paper: Paper, format: ExportFormat): Promise<void> {
  await copyContentToClipboard(buildClipboardContent(paper, format), format, `Copying ${getFormatTitle(format)}...`);
}

export async function fetchAndCopyFormatted(baseUrl: string, paperId: string, format: ExportFormat): Promise<void> {
  await copyContentToClipboard(
    fetchPaper(baseUrl, paperId).then((paper) => buildClipboardContent(paper, format)),
    format,
    "Fetching paper...",
  );
}

function buildClipboardContent(paper: Paper, format: ExportFormat): Clipboard.Content | string {
  const content = formatPaperAsClipboardContent(paper, format);
  if (typeof content === "string") {
    return content;
  }

  return {
    html: wrapClipboardHtml(content.html),
    text: content.text,
  };
}

function wrapClipboardHtml(html: string): string {
  const { fontFamily, fontSizePt } = getClipboardStylePreferences();
  const fontStack = buildFontStack(fontFamily).replace(/"/g, "'");
  const inlineStyle = `font-family: ${fontStack}; font-size: ${fontSizePt}pt; line-height: 1.35; color: black;`;

  // Inject inline styles into all elements - Word ignores <style> blocks but respects inline styles
  return html.replace(/<([a-z][a-z0-9]*)\b/gi, (match, tag) => {
    // Skip elements that shouldn't have style (like br, hr)
    if (["br", "hr", "meta", "link"].includes(tag.toLowerCase())) {
      return match;
    }
    return `<${tag} style="${inlineStyle}"`;
  });
}

function getClipboardStylePreferences(): { fontFamily: string; fontSizePt: number } {
  const preferences = getPreferenceValues<ExportPreferences>();

  return {
    fontFamily: sanitizeFontFamily(preferences.clipboardFontFamily),
    fontSizePt: sanitizeFontSize(preferences.clipboardFontSize),
  };
}

function sanitizeFontFamily(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "Arial";
}

function sanitizeFontSize(value: string | undefined): number {
  const size = Number(value);
  if (Number.isFinite(size) && size > 0 && size <= 72) {
    return size;
  }
  return 10;
}

function buildFontStack(fontFamily: string): string {
  const primary = quoteFontFamily(fontFamily);
  const fallbacks = ['"Arial"', '"Helvetica Neue"', "Helvetica", "sans-serif"];
  return [primary, ...fallbacks.filter((fallback) => fallback !== primary)].join(", ");
}

function quoteFontFamily(fontFamily: string): string {
  return `"${fontFamily.replace(/["\\]/g, "\\$&")}"`;
}

async function copyContentToClipboard(
  content: Clipboard.Content | string | Promise<Clipboard.Content | string>,
  format: ExportFormat,
  loadingTitle: string,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: loadingTitle,
  });

  try {
    await Clipboard.copy(await content);
    toast.style = Toast.Style.Success;
    toast.title = `${getFormatTitle(format)} copied`;
    await closeMainWindow();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to copy";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function fetchPaper(baseUrl: string, paperId: string): Promise<Paper> {
  const response = await fetch(`${baseUrl}/papers/${paperId}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as Paper;
}
