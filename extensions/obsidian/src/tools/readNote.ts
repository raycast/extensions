import { Logger } from "../api/logger/logger.service";
import { Obsidian, Vault } from "@/obsidian";

type Input = {
  /**
   * The FULL absolute path to the note file.
   * IMPORTANT: Always specify the complete absolute path to the note file (e.g., /path/to/vault/folder/note.md).
   */
  fullNotePath: string;
};

const logger = new Logger("Tool ReadNote");

/**
 * Read the content of a specific note by its FULL absolute path.
 */
export default async function tool(input: Input) {
  try {
    // Validate that the path is within a configured vault
    const allVaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();
    const isValidPath = Obsidian.validateNotePath(input.fullNotePath, allVaults);

    if (!isValidPath) {
      const vaultInfo = allVaults.map((v) => `${v.name} (${v.path})`).join(", ");
      logger.warning(`Invalid path provided: ${input.fullNotePath}`);
      return `Invalid path: The fullNotePath "${
        input.fullNotePath
      }" is not within any configured vault. Please use the FULL ABSOLUTE path to the note file (e.g., ${
        allVaults[0]?.path || "/path/to/vault"
      }/folder/note.md). Available vaults: ${vaultInfo}`;
    }

    const content = await Vault.readMarkdown(input.fullNotePath);
    let context = `The following is the content of the note ${input.fullNotePath}. Use this content to follow the users instructions.\n########START NOTE CONTENT ########\n\n`;
    context += `# ${input.fullNotePath
      .split("/")
      .pop()
      ?.replace(".md", "")}\n\n${content}\n\n######## END NOTE CONTENT ########`;

    logger.debug(context);
    return context;
  } catch (error) {
    logger.warning("Failed to read note at path: " + input.fullNotePath);
    return `Failed to read note at path "${input.fullNotePath}": ${error}`;
  }
}
