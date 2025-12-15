import { Tool, open } from "@raycast/api";
import fs from "fs";
import { applyTemplates } from "../api/templating/templating.service";
import { Obsidian, ObsidianTargetType } from "@/obsidian";

type Input = {
  /**
   * The FULL absolute path of the note to append text to. Leave empty if using daily note.
   * IMPORTANT: Always specify the complete absolute path to the note file (e.g., /path/to/vault/folder/note.md).
   */
  fullNotePath?: string;

  /**
   * The content to append
   */
  content: string;

  /**
   * Whether to use today's daily note instead of a specific note (default: false)
   */
  useDailyNote?: boolean;

  /**
   * Optional vault name (if not provided, uses first vault). Required when using daily note.
   */
  vaultName?: string;

  /**
   * Optional heading to append under (if not provided, appends to end)
   */
  heading?: string;

  /**
   * Whether to prepend instead of append (default: false)
   */
  prepend?: boolean;

  /**
   * Whether to append silently without opening Obsidian (default: true for daily notes, false for regular notes)
   */
  silent?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const vaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();

  if (vaults.length === 0) {
    return {
      message: "No vaults found. Please configure vault paths in preferences.",
    };
  }

  if (input.useDailyNote) {
    const targetVault = input.vaultName ? vaults.find((v) => v.name === input.vaultName) : vaults[0];

    if (!targetVault) {
      return {
        message: `Vault "${input.vaultName}" not found.`,
      };
    }

    return {
      message: `${input.prepend ? "Prepend" : "Append"} content to daily note in vault "${targetVault.name}"${
        input.heading ? ` under heading "${input.heading}"` : ""
      }?`,
    };
  }

  if (!input.fullNotePath) {
    return {
      message: "Either fullNotePath or useDailyNote must be provided.",
    };
  }

  return {
    message: `${input.prepend ? "Prepend" : "Append"} content to note "${input.fullNotePath}"${
      input.heading ? ` under heading "${input.heading}"` : ""
    }?`,
  };
};

/**
 * Append or prepend content to an existing note or today's daily note
 */
export default async function tool(input: Input) {
  const processedContent = await applyTemplates(input.content);

  // Handle daily note append (requires Advanced URI plugin)
  if (input.useDailyNote) {
    const vaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();

    if (vaults.length === 0) {
      return "No vaults found. Please configure vault paths in Raycast preferences.";
    }

    const targetVault = input.vaultName ? vaults.find((v) => v.name === input.vaultName) : vaults[0];

    if (!targetVault) {
      return `Vault "${input.vaultName}" not found. Available vaults: ${vaults.map((v) => v.name).join(", ")}`;
    }

    // Append to daily note using Advanced URI
    const target = Obsidian.getTarget({
      type: ObsidianTargetType.DailyNoteAppend,
      vault: targetVault,
      text: processedContent,
      heading: input.heading,
      prepend: input.prepend ?? false,
      silent: input.silent ?? true,
    });

    await open(target);

    return `Successfully ${input.prepend ? "prepended" : "appended"} content to daily note in vault "${
      targetVault.name
    }"${input.heading ? ` under heading "${input.heading}"` : ""} (Note: Requires Advanced URI plugin in Obsidian)`;
  }

  // Handle regular note append (direct file system)
  if (!input.fullNotePath) {
    return "Either fullNotePath or useDailyNote must be provided.";
  }

  // Validate that the path is within a configured vault
  const allVaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();
  const isValidPath = Obsidian.validateNotePath(input.fullNotePath, allVaults);

  if (!isValidPath) {
    const vaultInfo = allVaults.map((v) => `${v.name} (${v.path})`).join(", ");
    return `Invalid path: The fullNotePath "${
      input.fullNotePath
    }" is not within any configured vault. Please use the FULL ABSOLUTE path to the note file (e.g., ${
      allVaults[0]?.path || "/path/to/vault"
    }/folder/note.md). Available vaults: ${vaultInfo}`;
  }

  // Append or prepend the content
  if (input.prepend) {
    const existingContent = fs.readFileSync(input.fullNotePath, "utf8");
    fs.writeFileSync(input.fullNotePath, processedContent + "\n" + existingContent);
  } else {
    fs.appendFileSync(input.fullNotePath, "\n" + processedContent);
  }

  return `Successfully ${input.prepend ? "prepended" : "appended"} content to note "${input.fullNotePath}"`;
}
