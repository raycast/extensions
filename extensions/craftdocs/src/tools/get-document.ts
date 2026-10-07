import { buildOpenBlockUrl, parseLocalDate, resolveSpaceId, withCraftDatabases } from "../lib/aiTools";
import { findDailyNoteBlockId } from "../lib/dailyNotes";
import { filterDatabasesBySpaceId, searchBlocks } from "../lib/search";

type Input = {
  /** ID of the document to read (documentId from search-blocks). Omit to read a Daily Note instead. */
  documentId?: string;
  /** Daily Note date as YYYY-MM-DD, used when documentId is omitted. Defaults to today. */
  dailyNoteDate?: string;
  /** Space ID the document lives in. Omit for the primary space. */
  spaceId?: string;
};

const MAX_BLOCKS = 500;

// Title row first so the limit never cuts it; +2 = title row + one extra to detect truncation.
const documentBlocksQuery = `
SELECT id, content, type, entityType, documentId
FROM BlockSearch
WHERE documentId = ? OR id = ?
ORDER BY id = ? DESC
LIMIT ${MAX_BLOCKS + 2}
`;

/**
 * Read the text blocks of a Craft document or Daily Note from Craft's local search index.
 * The index has no block order, so blocks are NOT in reading order; don't infer sequence from them.
 * If the Craft API is configured, use craft-api GET /blocks?id=<documentId> for ordered content.
 */
export default async function (input: Input) {
  return withCraftDatabases(({ config, databases }) => {
    const spaceId = resolveSpaceId(config, input.spaceId);
    const documentId =
      input.documentId || findDailyNoteBlockId(databases, spaceId, parseLocalDate(input.dailyNoteDate));
    const [databaseWrap] = filterDatabasesBySpaceId(databases, spaceId);

    if (!documentId || !databaseWrap) {
      return "Document not found.";
    }

    const blocks = searchBlocks(databaseWrap.database, spaceId, documentBlocksQuery, [
      documentId,
      documentId,
      documentId,
    ]);
    const title = blocks.find((block) => block.entityType === "document")?.content;

    if (blocks.length === 0) {
      return "Document not found.";
    }

    const contentBlocks = blocks.filter((block) => block.entityType !== "document");

    return {
      title,
      documentId,
      spaceId,
      url: buildOpenBlockUrl(documentId, spaceId),
      note:
        contentBlocks.length > MAX_BLOCKS
          ? `Blocks are unordered (local search index has no document order). Only the first ${MAX_BLOCKS} blocks are shown; use craft-api GET /blocks for the full document.`
          : "Blocks are unordered (local search index has no document order).",
      blocks: contentBlocks.slice(0, MAX_BLOCKS).map((block) => block.content),
    };
  });
}
