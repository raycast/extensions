import { BrowserExtension, Clipboard, environment, getFrontmostApplication, getSelectedText } from "@raycast/api";
import type { TemplateRequirements } from "../prompts/template/render";
import { RunFailure } from "./failure";

/** Long pages would cost tokens and time for little gain, so browser content is cut at this length. */
export const MAX_BROWSER_CHARS = 100_000;

/**
 * Everything a run reads from the outside world, collected once at the start. It is JSON-safe because it may travel
 * through `launchCommand`, which keeps it in memory only.
 */
export interface RunInput {
  selection?: string;
  clipboard: Record<number, string | undefined>;
  browserTab: Record<string, string | undefined>;
  /** App that was in front at the start. A paste without a window only goes back there. */
  sourceApp?: string;
  /** Hints to show with the result, for example shortened content. */
  notices: string[];
}

export interface SessionContext {
  /** Issued per launch, see `session-context.ts`. It also separates one run from the next. */
  launchId: string;
  promptId: string;
  input: RunInput;
  /** Values already entered, so that a run handed over after a failure does not ask for them again. */
  args?: Record<string, string>;
  /** Set after a failed run without a window, so that the user gets the follow-up actions. */
  forcePreview?: boolean;
}

/** While Raycast's own window is open it may count as the front app, which says nothing about where the text is. */
const RAYCAST_BUNDLE_ID = "com.raycast.macos";

export async function frontmostAppId(): Promise<string | undefined> {
  try {
    const app = await getFrontmostApplication();
    return app.bundleId === RAYCAST_BUNDLE_ID ? undefined : (app.bundleId ?? app.path);
  } catch {
    return undefined;
  }
}

async function readSelection(read: () => Promise<string>): Promise<string> {
  let text: string;
  try {
    text = await read();
  } catch {
    throw new RunFailure("no-selection", "No Text Selected", "Select some text and try again.");
  }
  if (text.trim() === "") {
    throw new RunFailure("blank-selection", "Selection Is Blank", "The selection only contains whitespace.");
  }
  return text;
}

async function readBrowserTab(
  format: TemplateRequirements["browserTabs"][number]["format"],
  cssSelector: string | undefined,
  notices: string[],
): Promise<string> {
  if (!environment.canAccess(BrowserExtension)) {
    throw new RunFailure(
      "browser-extension",
      "Browser Extension Required",
      "Install the Raycast browser extension to use {browser-tab}.",
    );
  }
  let content: string;
  try {
    content = await BrowserExtension.getContent({ format, cssSelector });
  } catch {
    throw new RunFailure("browser-extension", "Cannot Read Browser Tab", "Open a page in a supported browser.");
  }
  if (cssSelector !== undefined && content === "") {
    throw new RunFailure("browser-extension", "Nothing Found", `No element matches the selector "${cssSelector}".`);
  }
  if (content.length <= MAX_BROWSER_CHARS) return content;
  notices.push(`Browser content was shortened to ${MAX_BROWSER_CHARS.toLocaleString("en-US")} characters.`);
  return content.slice(0, MAX_BROWSER_CHARS);
}

export interface CollectOptions {
  /** Let the prompt list reuse what it captured while it was opening. */
  selectionReader?: () => Promise<string>;
  sourceAppReader?: () => Promise<string | undefined>;
}

/** Reads only what the template uses, and the selection first, before anything can move the focus. */
export async function collectInput(
  requirements: TemplateRequirements,
  options: CollectOptions = {},
): Promise<RunInput> {
  const sourceApp = await (options.sourceAppReader ?? frontmostAppId)();
  const input: RunInput = { clipboard: {}, browserTab: {}, sourceApp, notices: [] };

  if (requirements.selection) input.selection = await readSelection(options.selectionReader ?? getSelectedText);
  await Promise.all(
    requirements.clipboardOffsets.map(async (offset) => {
      input.clipboard[offset] = await Clipboard.readText({ offset });
    }),
  );
  for (const tab of requirements.browserTabs) {
    input.browserTab[tab.key] = await readBrowserTab(tab.format, tab.selector, input.notices);
  }
  return input;
}
