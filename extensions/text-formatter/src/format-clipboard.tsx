import { Clipboard, showHUD, getPreferenceValues } from "@raycast/api";
import { offlineFormat } from "./lib/offline-format";
import { aiFormat } from "./lib/ai-format";
import { markdownToHtml } from "./lib/markdown-to-html";
import { htmlToMarkdown } from "./lib/html-to-markdown";
import { readClipboardHtml } from "./lib/clipboard-html";

interface Preferences {
  engine: "auto" | "ai" | "offline";
  anthropicApiKey?: string;
  model?: string;
}

export default async function Command() {
  try {
    await run();
  } catch (e) {
    // Surface the real failure instead of silently leaving the clipboard untouched.
    await showHUD(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function run() {
  const prefs = getPreferenceValues<Preferences>();

  // Rich sources (Superhuman, Gmail, Docs) keep bold, links, and real paragraph
  // breaks in the HTML flavor of the clipboard — the plain-text flavor has lost
  // all of it. So prefer HTML and convert it to markdown; only fall back to
  // plain text when there's no HTML flavor at all.
  // Raycast's Clipboard.read() doesn't expose the HTML flavor, so read it from
  // the system pasteboard directly. The HTML is where rich sources keep bold,
  // italics, and links; the plain-text flavor has already lost them.
  const html = readClipboardHtml();
  const text = await Clipboard.readText();

  let input = "";
  let fromHtml = false;
  if (html && html.trim()) {
    input = htmlToMarkdown(html);
    fromHtml = !!input;
  }
  if (!input) input = text?.trim() ?? "";
  if (!input) {
    await showHUD("❌ Clipboard is empty");
    return;
  }

  const hasKey = !!prefs.anthropicApiKey?.trim();
  const model = prefs.model?.trim() || "claude-haiku-4-5-20251001";

  let formatted: string;
  let usedEngine: "AI" | "offline" | "rich" = "offline";

  // Engine decision:
  // - "ai": always send to Claude (hard-fail without a key).
  // - rich HTML source: turndown already produced well-structured markdown
  //   (correct paragraphs, bold, links). Pass it through untouched — no need to
  //   spend an AI call or risk the offline heuristics mangling clean structure.
  // - plain-text source in "auto" with a key: use AI to ADD the missing structure.
  // - otherwise: offline heuristics.
  if (prefs.engine === "ai") {
    if (!hasKey) {
      await showHUD("❌ AI engine selected but no Anthropic API key set");
      return;
    }
    try {
      await showHUD("🤖 Formatting with Claude…");
      formatted = await aiFormat(input, {
        apiKey: prefs.anthropicApiKey!.trim(),
        model,
      });
      usedEngine = "AI";
    } catch (e) {
      await showHUD(`❌ AI failed: ${e instanceof Error ? e.message : "unknown error"}`);
      return;
    }
  } else if (fromHtml) {
    formatted = input;
    usedEngine = "rich";
  } else if (prefs.engine === "auto" && hasKey) {
    try {
      await showHUD("🤖 Formatting with Claude…");
      formatted = await aiFormat(input, {
        apiKey: prefs.anthropicApiKey!.trim(),
        model,
      });
      usedEngine = "AI";
    } catch {
      formatted = offlineFormat(input); // graceful degrade
      usedEngine = "offline";
    }
  } else {
    formatted = offlineFormat(input);
    usedEngine = "offline";
  }

  // Write BOTH flavors: markdown as plain text, rendered HTML as rich text.
  // The destination app picks whichever it understands.
  const richHtml = markdownToHtml(formatted);
  await Clipboard.copy({ text: formatted, html: richHtml });

  const label = usedEngine === "AI" ? "✅ Formatted (Claude) — ready to paste" : "✅ Formatted — ready to paste";
  await showHUD(label);
}
