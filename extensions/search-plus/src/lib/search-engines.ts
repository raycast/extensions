import { executeSQL, useSQL } from "@raycast/utils";
import { DB_PATH, readPreferences } from "./config";

export interface SearchEngine {
  id: number;
  t: string;
  s: string;
  u: string;
  c?: string;
  d?: string;
  r?: number;
  sc?: string;
}

export const useListSearchEngines = (searchText: string) =>
  useSQL<SearchEngine>(
    DB_PATH,
    searchText.trim()
      ? `SELECT * FROM search_engines
         WHERE t LIKE '%${searchText.trim()}%' OR s LIKE '%${searchText.trim()}%'
         ORDER BY r DESC, t ASC
         LIMIT 100`
      : `SELECT * FROM search_engines
         ORDER BY r DESC, t ASC
         LIMIT 100`,
    {
      permissionPriming: "This is required to list search engines.",
      onWillExecute: () => {
        console.log("Will execute:", searchText);
      },
    },
  );

export const findSearchEngine = async (searchEngineKey: string | undefined) => {
  const value = await executeSQL<SearchEngine>(
    DB_PATH,
    `SELECT * FROM search_engines 
     WHERE t = '${searchEngineKey ?? ""}' OR t = '${readPreferences().defaultSearchEngine}' 
     ORDER BY t = '${searchEngineKey ?? ""}' DESC 
     LIMIT 1`,
  );

  return value[0];
};
