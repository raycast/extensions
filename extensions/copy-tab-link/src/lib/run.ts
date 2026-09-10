import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { CleanTab, toCleanTab } from "./clean";
import { NoTabError, TabInfo, getActiveTab, getAllTabs } from "./browsers";
import { FormatId, getFormat } from "./formats";
import { copyRichText, htmlDocument, pasteClipboard } from "./richtext";
import { Settings, getSettings } from "./settings";

export type Mode = "copy" | "paste";

export interface Payload {
  /** Rich text goes onto the pasteboard as RTF and HTML, not as plain text. */
  rich: boolean;
  /** Complete HTML document, only set for rich text. */
  html?: string;
  /** Plain text: the content itself, or the fallback next to the rich text. */
  text: string;
  /** What the list detail and the confirmation show. */
  preview: string;
}

export function toPayload(formatId: FormatId, tab: CleanTab, settings: Settings): Payload {
  const format = getFormat(formatId);
  const rendered = format.render(tab, settings.format);

  if (format.rich) {
    const fallback = getFormat(settings.richTextFallback).render(tab, settings.format);
    // The HUD should say "Copied … Account erstellen", not show raw HTML.
    return { rich: true, html: htmlDocument(rendered), text: fallback, preview: tab.title || tab.url };
  }

  return { rich: false, text: rendered, preview: rendered };
}

function truncate(value: string, max = 60): string {
  const single = value.replace(/\s+/g, " ").trim();
  return single.length > max ? `${single.slice(0, max)}…` : single;
}

export async function deliver(payload: Payload, mode: Mode, label: string, settings: Settings) {
  if (payload.rich && payload.html) {
    if (mode === "paste") {
      await closeMainWindow();
      await copyRichText(payload.html, payload.text, settings.richTextMethod);
      await pasteClipboard();
      await showHUD(`Pasted as ${label}`);
      return;
    }
    await copyRichText(payload.html, payload.text, settings.richTextMethod);
    await showHUD(`Copied as ${label}: ${truncate(payload.preview)}`);
    return;
  }

  if (mode === "paste") {
    await closeMainWindow();
    await Clipboard.paste({ text: payload.text });
    await showHUD(`Pasted as ${label}`);
    return;
  }

  await Clipboard.copy({ text: payload.text });
  await showHUD(`Copied as ${label}: ${truncate(payload.preview)}`);
}

export async function runCopyCommand(formatId: FormatId, mode: Mode = "copy") {
  const settings = getSettings();
  try {
    const tab = await getActiveTab({
      browserSource: settings.browserSource,
      preferredBrowser: settings.preferredBrowser,
    });
    const clean = toCleanTab(tab.url, tab.title, settings.clean);
    await deliver(toPayload(formatId, clean, settings), mode, getFormat(formatId).title, settings);
  } catch (error) {
    if (error instanceof NoTabError) {
      await showFailureToast(error, { title: "No browser tab found" });
      return;
    }
    throw error;
  }
}

export function renderTabList(tabs: TabInfo[], settings: Settings): string {
  const format = getFormat(settings.allTabsFormat);
  return tabs
    .map((tab, index) => {
      const clean = toCleanTab(tab.url, tab.title, settings.clean);
      const line = format.render(clean, settings.format);
      if (settings.allTabsPrefix === "bullet") return `- ${line}`;
      if (settings.allTabsPrefix === "number") return `${index + 1}. ${line}`;
      return line;
    })
    .join("\n");
}

export async function runCopyAllTabs() {
  const settings = getSettings();
  try {
    const tabs = await getAllTabs({
      browserSource: settings.browserSource,
      preferredBrowser: settings.preferredBrowser,
    });
    await Clipboard.copy(renderTabList(tabs, settings));
    await showHUD(`Copied ${tabs.length} ${tabs.length === 1 ? "tab" : "tabs"}`);
  } catch (error) {
    if (error instanceof NoTabError) {
      await showFailureToast(error, { title: "No browser window found" });
      return;
    }
    throw error;
  }
}
