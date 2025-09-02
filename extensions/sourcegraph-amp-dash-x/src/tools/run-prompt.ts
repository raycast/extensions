import { Clipboard, getPreferenceValues } from "@raycast/api";
import { getPrompts } from "../lib/storage";
import type { Tool } from "@raycast/api";

export type Input = {
  /** Prompt ID. Takes precedence over title. */
  id?: string;
  /** Exact title match to find a prompt. */
  title?: string;
  /** Inline prompt text when not using saved prompts. */
  prompt?: string;
  /** Clipboard side-effect. none (default), copy, or paste. */
  clipboard?: "none" | "copy" | "paste";
};

/**
 * Build and optionally copy/paste an `amp -x` command for a saved or inline prompt.
 * Returns the full command string in a fenced code block for reference.
 */
export default async function tool(input: Input) {
  try {
    const prefs = getPreferenceValues<{
      ampBinaryPath?: string;
      defaultFlags?: string;
    }>();
    const bin = (prefs.ampBinaryPath || "amp").trim();
    const flags = (prefs.defaultFlags || "").trim();

    const text = await resolvePromptText(input);
    if (!text) {
      return "Error: No prompt provided. Supply `id`, `title`, or `prompt`.";
    }

    const command = buildAmpCommand(bin, flags, text);

    if (input.clipboard && input.clipboard !== "none") {
      if (input.clipboard === "copy") {
        await Clipboard.copy(command);
      } else if (input.clipboard === "paste") {
        await Clipboard.paste(command);
      }
    }

    return ["Command prepared:", "", "```bash", command, "```"].join("\n");
  } catch (err) {
    return `Error building command: ${String(err)}`;
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input.clipboard || input.clipboard === "none") return;
  const where =
    input.clipboard === "copy"
      ? "copy to your clipboard"
      : "paste into the frontmost app";
  return {
    message: `This will ${where}. Proceed?`,
    info: [
      { name: "Tip", value: "Set clipboard: 'none' to avoid side-effects." },
    ],
  };
};

async function resolvePromptText(input: Input): Promise<string | null> {
  if (input.prompt && input.prompt.trim()) return input.prompt.trim();

  const all = await getPrompts();
  if (input.id) {
    const byId = all.find((p) => p.id === input.id);
    if (byId) return byId.prompt;
  }
  if (input.title) {
    const byTitle = all.find(
      (p) => p.title.toLowerCase() === input.title!.toLowerCase(),
    );
    if (byTitle) return byTitle.prompt;
  }
  return null;
}

function buildAmpCommand(bin: string, flags: string, prompt: string): string {
  const parts = [bin, "-x"];
  if (flags) parts.push(flags);
  // Escape double quotes inside prompt
  const safe = prompt.replace(/"/g, '\\"');
  parts.push(`"${safe}"`);
  return parts.join(" ");
}
