import { BrowserExtension, getSelectedText } from "@raycast/api";
import type { CaptureMode, Clip } from "./types";

async function getCurrentTabMeta(): Promise<{ title: string; url: string }> {
  let title = "Untitled page";
  try {
    const pageTitle = await BrowserExtension.getContent({ cssSelector: "title", format: "text" });
    if (pageTitle.trim()) title = pageTitle.trim();
  } catch {
    // We can still use getTabs below.
  }

  try {
    const tabs = (await BrowserExtension.getTabs()) as Array<{ active: boolean; title?: string; url: string }>;
    const activeTabs = tabs.filter((tab: { active: boolean }) => tab.active);
    const matching = activeTabs.find((tab: { title?: string }) => (tab.title ?? "").trim() === title);
    const tab = matching ?? activeTabs[0];
    if (tab) {
      return {
        title: tab.title?.trim() || title,
        url: tab.url || "",
      };
    }
  } catch {
    // Return title-only fallback.
  }

  return { title, url: "" };
}

export async function capture(mode: CaptureMode): Promise<Clip> {
  const meta = await getCurrentTabMeta();
  let content = "";

  if (mode === "selection") {
    content = (await getSelectedText()).trim();
    if (!content) {
      throw new Error("No text is selected in the browser.");
    }
  } else if (mode === "page") {
    content = (await BrowserExtension.getContent({ format: "markdown" })).trim();
    if (!content) {
      throw new Error("Could not extract content from the current page.");
    }
  }

  return {
    mode,
    title: meta.title,
    url: meta.url,
    content,
    capturedAt: new Date().toISOString(),
  };
}

export function clipToMarkdown(clip: Clip): string {
  const sourceLabel = clip.url || "URL unavailable";
  const body = clip.mode === "url" ? "" : `\n\n## Content\n\n${clip.content}`;
  return `# ${clip.title}\n\n- Source: ${sourceLabel}\n- Captured: ${clip.capturedAt}\n- Capture mode: ${clip.mode}${body}\n`;
}

function readablePreview(clip: Clip): string {
  if (!clip.content.trim()) return "";

  const limit = clip.mode === "selection" ? 4000 : 1200;
  const clean = clip.content.trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).trimEnd()}\n\n…`;
}

export function buildPrompt(clip: Clip, promptMode: string, customInstruction?: string): string {
  const instruction = customInstruction?.trim()
    ? customInstruction.trim()
    : promptMode === "summarize"
      ? "Summarize the attached material concisely: key points, important facts, disputed or uncertain claims, and practical takeaways. Reply in the language of the source material unless instructed otherwise."
      : promptMode === "research"
        ? "Analyze the attached material critically. Identify its key claims, what needs verification, likely weaknesses, and useful directions for further research. Reply in the language of the source material unless instructed otherwise."
        : promptMode === "discuss"
          ? "Let's discuss the attached material. Start by identifying what is most important, interesting, or actionable. Reply in the language of the source material unless instructed otherwise."
          : "The material is attached as context. Use the source carefully, avoid unsupported assumptions, and reply in the language of the source material unless instructed otherwise.";

  const lines = [instruction, "", `Source: ${clip.url || "URL unavailable"}`, `Title: ${clip.title}`];
  const preview = readablePreview(clip);
  if (preview) {
    lines.push("", clip.mode === "selection" ? "Captured selection:" : "Material preview:", "", preview);
  }
  lines.push("", `The full material is attached as ${safeFilename(clip.title)}.`);
  return lines.join("\n");
}

export function chatTitleFromClip(clip: Clip): string {
  const pageTitle = clip.title.trim();
  const genericTitles = new Set([
    "untitled page",
    "new tab",
    "about:blank",
    "chatgpt",
  ]);

  if (pageTitle && !genericTitles.has(pageTitle.toLowerCase())) {
    return pageTitle.slice(0, 120);
  }

  const firstMeaningfulLine = clip.content
    .split(/\r?\n/)
    .map((line) => line
      .replace(/^\s{0,3}#{1,6}\s+/, "")
      .replace(/^\s*[-*+>]\s+/, "")
      .replace(/^\s*\d+[.)]\s+/, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .trim())
    .find((line) => line.length >= 8 && !/^https?:\/\//i.test(line));

  if (firstMeaningfulLine) {
    return firstMeaningfulLine.replace(/\s+/g, " ").slice(0, 120);
  }

  try {
    if (clip.url) return new URL(clip.url).hostname.replace(/^www\./, "").slice(0, 120);
  } catch {
    // Ignore malformed URL and use a neutral fallback.
  }

  return "Web Clip";
}

export function safeFilename(title: string, suffix = ".md"): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return `${cleaned || "web-clip"}${suffix}`;
}
