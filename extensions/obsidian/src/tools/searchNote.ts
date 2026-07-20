import { Logger } from "../api/logger/logger.service";
import { filterNotesFuzzy } from "../api/search/search.service";
import { searchNotesWithContent } from "../api/search/simple-content-search.service";
import { Note, Obsidian, ObsidianVault } from "@/obsidian";
import { getNotesWithCache } from "../utils/hooks";

type Input = {
  /**
   * The search term for the note to find
   */
  searchTerm: string;
  /**
   * If the user provides a vault name or hints towards one, ALWAYS use it here.
   */
  vaultName?: string;
  /**
   * Whether to search inside note content and enable tag filtering.
   * Set to false for faster title/path-only search.
   * Defaults to true.
   */
  searchContent?: boolean;
};

const logger = new Logger("Tool SearchNote");

const MAX_RESULTS = 50;

/**
 * Search for notes in Obsidian vaults and return a list of matching notes with their title, vault, and path
 */
export default async function tool(input: Input) {
  const vaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();

  if (vaults.length === 0) {
    logger.warning("No vaults configured");
    return "No vaults found. Please configure vault paths in Raycast preferences.";
  }

  const targetVaults = input.vaultName ? vaults.filter((v) => v.name === input.vaultName) : vaults;

  if (targetVaults.length === 0) {
    logger.warning(`Could not find vault ${input.vaultName}`);
    return `Vault "${input.vaultName}" not found. Available vaults: ${vaults.map((v) => v.name).join(", ")}`;
  }

  const useContentSearch = input.searchContent !== false;

  logger.info(`Searching with ${useContentSearch ? "content search" : "title/path only"} for "${input.searchTerm}"`);

  // Search across all target vaults
  const allFilteredNotes: { note: Note; vault: ObsidianVault }[] = [];

  for (const vault of targetVaults) {
    const notes = await getNotesWithCache(vault.path);

    const filtered: Note[] = useContentSearch
      ? await searchNotesWithContent(notes, input.searchTerm)
      : filterNotesFuzzy(notes, input.searchTerm);

    logger.info(
      `${useContentSearch ? "Content" : "Title/path"} search found ${filtered.length} notes in ${vault.name}`
    );

    allFilteredNotes.push(...filtered.map((note) => ({ note, vault })));
  }

  if (allFilteredNotes.length === 0) {
    logger.warning(`No notes found matching ${input.searchTerm}`);
    const searchTypeInfo = useContentSearch
      ? " (searched title, path, and content)"
      : " (searched title and path only - set searchContent=true for full-text and tag search)";
    return `No notes found matching "${input.searchTerm}"${searchTypeInfo}.`;
  }

  const limitedNotes = allFilteredNotes.slice(0, MAX_RESULTS);
  const hasMore = allFilteredNotes.length > MAX_RESULTS;

  // Return list of all matching notes
  const searchTypeLabel = useContentSearch ? "content search" : "title/path search";
  let result = `Found ${allFilteredNotes.length} note(s) matching "${input.searchTerm}" (${searchTypeLabel})${
    hasMore ? `, showing first ${MAX_RESULTS}` : ""
  }:\n\n`;

  limitedNotes.forEach(({ note, vault }, index) => {
    result += `${index + 1}. **${note.title}**\n`;
    result += `   - Vault: ${vault.name}\n`;
    result += `   - Path: ${note.path}\n\n`;
  });

  logger.debug(result);

  return result;
}
