import { savePrompt } from "../lib/storage";
import { getPreferenceValues } from "@raycast/api";

export type Input = {
  /** Title for the saved prompt. Must be unique and descriptive. */
  title: string;
  /** The amp prompt text to store. */
  prompt: string;
  /** Category name. Defaults to "General". */
  category?: string;
  /** Optional description shown in lists. */
  description?: string;
};

/**
 * Add a new saved Amp prompt to the library.
 * Returns a Markdown summary including the ready-to-run `amp -x` command.
 */
export default async function tool(input: Input) {
  try {
    const title = (input.title || "").trim();
    const body = (input.prompt || "").trim();
    const category = (input.category || "General").trim() || "General";
    const description = (input.description || "").trim();

    if (!title) return "Error: `title` is required.";
    if (!body) return "Error: `prompt` is required.";

    await savePrompt({
      title,
      prompt: body,
      category,
      ...(description ? { description } : {}),
    });

    const prefs = getPreferenceValues<{
      ampBinaryPath?: string;
      defaultFlags?: string;
    }>();
    const bin = (prefs.ampBinaryPath || "amp").trim();
    const flags = (prefs.defaultFlags || "").trim();
    const command = buildAmpCommand(bin, flags, body);

    const lines: string[] = [];
    lines.push(`# ${title}`);
    lines.push("");
    lines.push(`**Category:** ${category}`);
    if (description) {
      lines.push("");
      lines.push(`**Description:** ${description}`);
    }
    lines.push("");
    lines.push("**Prompt:**");
    lines.push("```");
    lines.push(body);
    lines.push("```");
    lines.push("");
    lines.push("**Command:**");
    lines.push("```bash");
    lines.push(command);
    lines.push("```");

    return lines.join("\n");
  } catch (err) {
    return `Error adding prompt: ${String(err)}`;
  }
}

function buildAmpCommand(bin: string, flags: string, prompt: string): string {
  const parts = [bin, "-x"];
  if (flags) parts.push(flags);
  const safe = prompt.replace(/"/g, '\\"');
  parts.push(`"${safe}"`);
  return parts.join(" ");
}
