import { environment } from "@raycast/api";
import initSqlJs, { Database, QueryExecResult } from "sql.js";
import { getHistoryDbPath } from "../util";
import { readFileSync } from "fs";
import path from "path";
import { HistoryEntry } from "../interfaces";

type Input = {
  /** The query to search for in the history */
  query: string;
};

async function loadDatabase(): Promise<Database> {
  const historyDbPath = getHistoryDbPath();
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(environment.assetsPath, file),
  });
  const db = readFileSync(historyDbPath);
  return new SQL.Database(db);
}

async function getChromeHistory(query?: string) {
  try {
    const db = await loadDatabase();

    const searchTerms = query ? query.trim().split(" ") : [""];
    const whereConditions = searchTerms.map((term) => `(title LIKE '%${term}%' OR url LIKE '%${term}%')`).join(" AND ");

    const results: QueryExecResult[] = db.exec(`
        SELECT id, url, title, last_visit_time as lastVisited
        FROM urls
        WHERE ${whereConditions}
        AND last_visit_time > 0
        ORDER BY last_visit_time DESC
        LIMIT 30
      `);

    const mappedData = results[0].values.map((valueArray) => {
      return results[0].columns.reduce<Partial<HistoryEntry>>(
        (obj, column, index) => ({
          ...obj,
          [column]: valueArray[index],
        }),
        {},
      ) as HistoryEntry;
    });

    return mappedData;
  } catch (error) {
    console.error("Failed to retrieve Chrome history:", error);

    return [];
  }
}

export default async function (input: Input) {
  if (!input.query) {
    return "Please enter a history search query.";
  }

  const history = await getChromeHistory(input.query);

  return history;
}
