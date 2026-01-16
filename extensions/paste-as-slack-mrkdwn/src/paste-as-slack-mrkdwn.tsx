import { Clipboard, getPreferenceValues, showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { convertMarkdownToSlack } from "./converter";
import { hasRichFormatting, htmlToMarkdown } from "./html-to-markdown";

interface Preferences {
  autoFormat: boolean;
}

const execAsync = promisify(exec);

/**
 * Small delay to let the UI catch up
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send keyboard shortcut via AppleScript
 */
async function sendKeyboardShortcut(
  key: string,
  modifiers: string[],
): Promise<void> {
  const modifierStr = modifiers.map((m) => `${m} down`).join(", ");
  const script = `
    tell application "System Events"
      keystroke "${key}" using {${modifierStr}}
    end tell
  `;
  await execAsync(`osascript -e '${script}'`);
}

/**
 * Get HTML from system clipboard using osascript
 * Raycast's Clipboard.read() doesn't always return HTML, but this does
 */
async function getSystemClipboardHtml(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      "osascript -e 'the clipboard as «class HTML»' 2>/dev/null | perl -pe 's/«data HTML(.*)»/$1/' | xxd -r -p",
    );
    return stdout && stdout.trim() ? stdout : null;
  } catch {
    return null;
  }
}

export default async function Command() {
  try {
    // Read clipboard - get both text and HTML from Raycast API
    const clipboardContent = await Clipboard.read();
    const plainText = clipboardContent.text;
    let html = clipboardContent.html;

    // If Raycast didn't get HTML, try system clipboard directly
    if (!html) {
      const systemHtml = await getSystemClipboardHtml();
      if (systemHtml) {
        html = systemHtml;
      }
    }

    if (
      (!plainText || plainText.trim() === "") &&
      (!html || html.trim() === "")
    ) {
      await showHUD("❌ Clipboard is empty");
      return;
    }

    let markdown: string;

    // Check if HTML is available and has rich formatting
    if (html && hasRichFormatting(html)) {
      // Convert HTML to Markdown first
      markdown = htmlToMarkdown(html);
    } else {
      // Treat plain text as Markdown
      markdown = plainText || "";
    }

    if (!markdown.trim()) {
      await showHUD("❌ No content to convert");
      return;
    }

    // Convert Markdown to Slack format
    const slackText = convertMarkdownToSlack(markdown);

    // Copy converted text to clipboard AND paste it
    await Clipboard.copy(slackText);
    await Clipboard.paste(slackText);

    // Check if auto-format is enabled
    const preferences = getPreferenceValues<Preferences>();

    if (preferences.autoFormat) {
      // Wait for paste to complete
      await delay(100);

      // Select all (Cmd + A)
      await sendKeyboardShortcut("a", ["command"]);
      await delay(50);

      // Format for Slack (Cmd + Shift + F)
      await sendKeyboardShortcut("f", ["command", "shift"]);
    }

    await showHUD("✅ Pasted as Slack mrkdwn");
  } catch (error) {
    console.error("Paste Markdown as Slack error:", error);
    await showHUD("❌ Failed to convert");
  }
}
