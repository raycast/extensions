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

const documentBlocksQuery = `
SELECT id, content, type, entityType, documentId
FROM BlockSearch
WHERE documentId = ? OR id = ?
`;

/** Read the full text content of a Craft document or Daily Note. */
export default async function (input: Input) {
  return withCraftDatabases(({ config, databases }) => {
    const spaceId = resolveSpaceId(config, input.spaceId);
    const documentId =
      input.documentId || findDailyNoteBlockId(databases, spaceId, parseLocalDate(input.dailyNoteDate));
    const [databaseWrap] = filterDatabasesBySpaceId(databases, spaceId);

    if (!documentId || !databaseWrap) {
      return "Document not found.";
    }

    const blocks = searchBlocks(databaseWrap.database, spaceId, documentBlocksQuery, [documentId, documentId]);
    const title = blocks.find((block) => block.entityType === "document")?.content;

    if (blocks.length === 0) {
      return "Document not found.";
    }

    return {
      title,
      documentId,
      spaceId,
      url: buildOpenBlockUrl(documentId, spaceId),
      // ponytail: search index has no block order, so blocks may come back out of document order.
      content: blocks
        .filter((block) => block.entityType !== "document")
        .map((block) => block.content)
        .join("\n"),
    };
  });
}
