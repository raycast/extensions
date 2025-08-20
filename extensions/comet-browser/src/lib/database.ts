import { useSQL } from "@raycast/utils";
import { CometHistoryEntry } from "./types";
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

const COMET_HISTORY_PATH = join(homedir(), "Library", "Application Support", "Comet", "Default", "History");

export function getCometHistoryPath(): string {
  if (existsSync(COMET_HISTORY_PATH)) {
    return COMET_HISTORY_PATH;
  }
  throw new Error("Comet history database not found");
}

// React hook for accessing history with proper SQL integration
export function useCometHistoryDB(searchText: string, limit = 100) {
  try {
    const dbPath = getCometHistoryPath();

    // Build safe SQL query
    const searchPattern = searchText.trim().replace(/'/g, "''"); // Basic SQL injection protection

    let query: string;
    if (searchText.trim()) {
      query = `
        SELECT 
          id,
          url,
          title,
          visit_count,
          last_visit_time,
          typed_count
        FROM urls
        WHERE (
          title LIKE '%${searchPattern}%' 
          OR url LIKE '%${searchPattern}%'
        )
        AND title != ''
        AND title != 'New Tab'
        ORDER BY last_visit_time DESC
        LIMIT ${limit}
      `;
    } else {
      query = `
        SELECT 
          id,
          url,
          title,
          visit_count,
          last_visit_time,
          typed_count
        FROM urls
        WHERE title != ''
        AND title != 'New Tab'
        ORDER BY last_visit_time DESC
        LIMIT ${limit}
      `;
    }

    return useSQL<CometHistoryEntry>(dbPath, query);
  } catch (error) {
    console.warn("Failed to access Comet history database:", error);
    // Return a mock useSQL result for error cases
    return {
      data: [],
      isLoading: false,
      error: error as Error,
    };
  }
}
