import { runAppleScript } from "run-applescript";
import { CapturedContext } from "./types";
import { getAppHandler } from "./app-handlers";

export async function getFrontmostAppContext(): Promise<CapturedContext> {
  const appName = await runAppleScript(`
    tell application "System Events"
      return name of first process whose frontmost is true
    end tell
  `);

  const handler = getAppHandler(appName);
  if (handler) {
    try {
      return await handler.getContext();
    } catch (err) {
      console.error(`Handler failed for ${appName}:`, err);
      return getGenericContext(appName);
    }
  }
  return getGenericContext(appName);
}

async function getGenericContext(appName: string): Promise<CapturedContext> {
  // Escape backslashes and quotes for AppleScript
  const escaped = appName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  try {
    const title = await runAppleScript(`
      tell application "System Events"
        tell process "${escaped}"
          return name of front window
        end tell
      end tell
    `);
    return { appName, title: title || appName, url: null, type: "generic" };
  } catch (err) {
    console.error(`Generic handler failed for ${appName}:`, err);
    return { appName, title: appName, url: null, type: "generic" };
  }
}

function sanitizeTitle(title: string): string {
  try {
    // Decode URL-encoded characters and replace + with space
    return decodeURIComponent(title.replace(/\+/g, " ")).trim();
  } catch {
    // If decoding fails, just replace + with space
    return title.replace(/\+/g, " ").trim();
  }
}

export function formatTitleWithEmoji(context: CapturedContext): string {
  const emoji: Record<CapturedContext["type"], string> = {
    browser: "🌐",
    email: "📧",
    file: "📁",
    note: "📝",
    message: "💬",
    generic: "📌",
  };
  return `${emoji[context.type]} ${sanitizeTitle(context.title)}`;
}
