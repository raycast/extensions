import { environment } from "@raycast/api";
import initSqlJs, { Database, QueryExecResult } from "sql.js";
import { getHistoryDbPath, getAvailableProfiles, resolveProfileName } from "../util";
import { readFileSync } from "fs";
import path from "path";
import { HistoryEntry } from "../interfaces";

type Input = {
  /** The query to search for in the history (optional, returns recent history if empty) */
  query?: string;
  /** The profile to search in (optional, defaults to "Default") */
  profile?: string;
};

async function loadDatabase(profile?: string): Promise<Database> {
  const historyDbPath = getHistoryDbPath(profile);
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(environment.assetsPath, file),
  });
  const db = readFileSync(historyDbPath);
  return new SQL.Database(db);
}

async function getCometHistory(query?: string, profile?: string) {
  try {
    const db = await loadDatabase(profile);

    let sqlQuery: string;

    if (!query || query.trim() === "") {
      // If no query, return recent history
      sqlQuery = `
        SELECT id, url, title, last_visit_time as lastVisited
        FROM urls
        WHERE last_visit_time > 0
        ORDER BY last_visit_time DESC
        LIMIT 30
      `;
    } else {
      // Filter by search terms
      const searchTerms = query.trim().split(" ");
      const whereConditions = searchTerms
        .map((term) => `(title LIKE '%${term}%' OR url LIKE '%${term}%')`)
        .join(" AND ");

      sqlQuery = `
        SELECT id, url, title, last_visit_time as lastVisited
        FROM urls
        WHERE ${whereConditions}
        AND last_visit_time > 0
        ORDER BY last_visit_time DESC
        LIMIT 30
      `;
    }

    const results: QueryExecResult[] = db.exec(sqlQuery);

    if (!results[0] || !results[0].values) {
      return [];
    }

    const mappedData = results[0].values.map((valueArray) => {
      return results[0].columns.reduce<Partial<HistoryEntry>>(
        (obj, column, index) => ({
          ...obj,
          [column]: valueArray[index],
        }),
        {}
      ) as HistoryEntry;
    });

    return mappedData;
  } catch (error) {
    console.error("Failed to retrieve Comet history:", error);

    return [];
  }
}

export default async function (input: Input) {
  try {
    // Resolve profile name (e.g., "yunit" -> "Profile 3")
    const resolvedProfile = resolveProfileName(input.profile);
    const history = await getCometHistory(input.query, resolvedProfile);
    return history;
  } catch (error) {
    // Get available profiles to help user
    const availableProfiles = getAvailableProfiles();
    return `Error: ${
      error instanceof Error ? error.message : "Unknown error occurred"
    }. Available profiles are: ${availableProfiles.join(", ")}. Try using one of these profile names.`;
  }
}
