import { buildOpenBlockUrl, withCraftDatabases } from "../lib/aiTools";
import { filterDatabasesBySpaceId, searchBlocksAcrossDatabases } from "../lib/search";

type Input = {
  /** Words to search for in Craft blocks and documents. Leave empty to get top blocks. */
  query: string;
  /** Optional space ID to search in. Omit to search all enabled spaces. */
  spaceId?: string;
};

/** Search the user's Craft documents and blocks. Returns matching content, its document, IDs and a link to open it. */
export default async function (input: Input) {
  return withCraftDatabases(({ config, databases }) =>
    searchBlocksAcrossDatabases(filterDatabasesBySpaceId(databases, input.spaceId), input.query).map((block) => ({
      content: block.content,
      type: block.entityType,
      blockId: block.id,
      documentId: block.documentID || block.id,
      document: block.documentName || block.content,
      spaceId: block.spaceID,
      space: config.getSpaceDisplayName(block.spaceID),
      url: buildOpenBlockUrl(block.id, block.spaceID),
    })),
  );
}
