import {
  Clipboard,
  closeMainWindow,
  environment,
  open,
  showHUD,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";

const sites = {
  claude: {
    url: "https://claude.ai/new",
    label: "Write your prompt to Claude",
  },
  gemini: {
    url: "https://gemini.google.com/app",
    label: "Enter a prompt for Gemini",
  },
  chatgpt: { url: "https://chatgpt.com/", label: "Ask ChatGPT" },
  grok: { url: "https://grok.com/", label: "Ask Grok anything" },
} as const;

function fillPrompt(url: string, label: string, text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      join(environment.assetsPath, "wait-for-composer"),
      [url, label],
      { timeout: 45000 },
      (error, stdout) => (error ? reject(error) : resolve(stdout.trim())),
    );
    child.stdin?.on("error", reject);
    // Text stays in memory; never put it in URLs, process arguments, or logs.
    child.stdin?.end(text);
  });
}

export async function openChat(
  provider: keyof typeof sites,
  {
    useClipboard = false,
    query,
  }: { useClipboard?: boolean; query?: string } = {},
) {
  try {
    const text = useClipboard ? await Clipboard.readText() : query;
    const site = sites[provider];
    await closeMainWindow({ clearRootSearch: true });
    await open(site.url, "com.google.Chrome");
    if (!text?.trim()) return;

    // Fill the identified prompt without submitting it.
    const result = await fillPrompt(site.url, site.label, text);
    if (result === "filled") return;
    if (result === "pasted-unverified") {
      await showHUD(
        "Check the chat before sending — pasted content could not be verified",
      );
      return;
    }
    if (result === "accessibility") {
      await showHUD(
        "Allow Raycast in System Settings → Privacy & Security → Accessibility, then retry",
      );
    } else if (result === "draft") {
      await showHUD(
        useClipboard
          ? "Existing draft kept — press ⌘V to add your clipboard"
          : "Existing draft kept — retry your query in a new chat",
      );
    } else {
      await showHUD(
        useClipboard
          ? "Site opened — focus the prompt box and press ⌘V"
          : "Couldn’t fill the query — wait for the chat to load, then retry the command",
      );
    }
    return result;
  } catch {
    await showHUD("Couldn’t complete the chat — check Chrome to continue");
  }
}
