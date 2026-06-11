import { DatabaseWrap } from "./databaseLoader";
import { buildMatchQuery, filterDatabasesBySpaceId, searchBlocks } from "./search";
import { formatCraftInternalDate } from "../utils/dateTimeFormatter";

const dailyNoteLookupQuery = `
SELECT id, content, type, entityType, documentId
FROM BlockSearch(?)
WHERE entityType = 'document'
ORDER BY rank + customRank
LIMIT 1
`;

export const buildDailyNoteOpenUrl = (query: string, spaceID: string) => {
  return `craftdocs://openByQuery?query=${query}&spaceId=${spaceID}`;
};

export const buildDailyNoteDateQuery = (date: Date) => {
  return date.toISOString().substring(0, 10);
};

export const findDailyNoteBlockId = (databases: DatabaseWrap[], spaceID: string, date: Date): string | null => {
  const [databaseWrap] = filterDatabasesBySpaceId(databases, spaceID);

  if (!databaseWrap) {
    return null;
  }

  const matchQuery = buildMatchQuery(formatCraftInternalDate(date));

  if (!matchQuery) {
    return null;
  }

  const [dailyNote] = searchBlocks(databaseWrap.database, databaseWrap.spaceID, dailyNoteLookupQuery, [matchQuery]);

  return dailyNote?.id ?? null;
};
