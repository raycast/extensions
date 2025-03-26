import { BrowserExtension, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

function sanitizeForHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeUrl(url: string): string {
  try {
    new URL(url);
    return url;
  } catch (error: unknown) {
    console.debug(error);
    return "about:blank";
  }
}

export function generateHTML(tab: BrowserExtension.Tab): string {
  const { title, url } = tab;
  const safeTitle = sanitizeForHtml(title || "");
  const safeUrl = sanitizeUrl(url);
  const htmlLink = `<a href="${safeUrl}">${safeTitle}</a>`;
  return htmlLink;
}

function sanitizeForMarkdown(text: string): string {
  // Escape markdown special characters: [ ] ( ) ` * _ { } # + - . !
  return text.replace(/([[\]()"`*_{}\\#+\-.!])/g, "\\$1");
}

export function generateMarkdown(title: string, url: string): string {
  const safeTitle = sanitizeForMarkdown(title || "");
  const safeUrl = sanitizeUrl(url);
  const markdownLink = `[${safeTitle}](${safeUrl})`;
  return markdownLink;
}

interface CopyCustomFormatPreferences {
  customFormat: string;
}

function applyCustomTemplate(template: string, tab: BrowserExtension.Tab): string {
  const { url, title, id, favicon } = tab;
  const safeUrl = sanitizeUrl(url);
  const safeTitle = title || "";
  const safeFavicon = favicon || "";

  return template
    .replace(/\{url\}/g, safeUrl)
    .replace(/\{title\}/g, safeTitle)
    .replace(/\{id\}/g, String(id))
    .replace(/\{favicon\}/g, safeFavicon);
}

export function generateCustomTemplate(tab: BrowserExtension.Tab) {
  try {
    const preferences = getPreferenceValues<CopyCustomFormatPreferences>();
    const { customFormat } = preferences;

    if (!customFormat || customFormat.trim() === "") {
      showFailureToast("No custom format defined, Please set a custom format in the extension settings.", {
        title: "No custom format defined",
        primaryAction: {
          title: "Open Extension Settings",
          onAction: () => {
            openExtensionPreferences();
          },
        },
      });
      return "";
    }

    return applyCustomTemplate(customFormat, tab);
  } catch (error: unknown) {
    console.debug(error);
    return "";
  }
}
