import { open, Tool } from "@raycast/api";
import { invalidateNotesCache } from "../api/cache/cache.service";
import { createNote } from "../api/create-note";
import { Obsidian, ObsidianTargetType } from "@/obsidian";

type Input = {
  /**
   * The name of the note to create (not used for daily notes)
   */
  name?: string;
  /**
   * The content of the note
   */
  content?: string;
  /**
   * Whether to create/open today's daily note instead of a regular note (default: false)
   */
  useDailyNote?: boolean;
  /**
   * Optional vault name (if not provided, uses first vault)
   */
  vaultName?: string;
  /**
   * Optional path within the vault (e.g., "folder/subfolder")
   */
  path?: string;
  /**
   * Optional tags to add to the note (comma-separated)
   */
  tags?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const vaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();

  if (vaults.length === 0) {
    return {
      message: "No vaults found. Please configure vault paths in preferences.",
    };
  }

  const targetVault = input.vaultName ? vaults.find((v) => v.name === input.vaultName) : vaults[0];

  if (!targetVault) {
    return {
      message: `Vault "${input.vaultName}" not found.`,
    };
  }

  if (input.useDailyNote) {
    return {
      message: `Create/open daily note in vault "${targetVault.name}"?`,
    };
  }

  if (!input.name) {
    return {
      message: "Note name is required when not using daily note.",
    };
  }

  return {
    message: `Create note "${input.name}" in vault "${targetVault.name}"${
      input.path ? ` at path "${input.path}"` : ""
    }?`,
  };
};

/**
 * Create a new note in an Obsidian vault or create/open today's daily note
 */
export default async function tool(input: Input) {
  const vaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();

  if (vaults.length === 0) {
    return "No vaults found. Please configure vault paths in Raycast preferences.";
  }

  const targetVault = input.vaultName ? vaults.find((v) => v.name === input.vaultName) : vaults[0];

  if (!targetVault) {
    return `Vault "${input.vaultName}" not found. Available vaults: ${vaults.map((v) => v.name).join(", ")}`;
  }

  // Handle daily note creation (requires Advanced URI plugin)
  if (input.useDailyNote) {
    const target = Obsidian.getTarget({
      type: ObsidianTargetType.DailyNote,
      vault: targetVault,
    });

    await open(target);

    return `Opened daily note in vault "${targetVault.name}" (Note: Requires Advanced URI plugin in Obsidian)`;
  }

  // Handle regular note creation
  if (!input.name) {
    return "Note name is required when not using daily note.";
  }

  // Parse tags
  const tags = input.tags ? input.tags.split(",").map((tag) => tag.trim()) : [];

  // Default to vault root (empty string) unless a path is explicitly provided
  const notePath = input.path || "";

  // Create the note
  const saved = await createNote(targetVault, {
    name: input.name,
    content: input.content || "",
    path: notePath,
    tags: tags,
  });

  if (saved) {
    invalidateNotesCache(targetVault.path);
    return `Successfully created note "${input.name}" in vault "${targetVault.name}"${
      notePath ? ` at path "${notePath}"` : " at vault root"
    }`;
  } else {
    return `Failed to create note "${input.name}" in vault "${targetVault.name}"`;
  }
}
