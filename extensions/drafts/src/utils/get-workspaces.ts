import { homedir } from "os";
import { executeSQL } from "@raycast/utils";
import { DataBasePath } from "./Defines";

export type Workspace = {
  isChangedBacking: string;
  tintColor: string;
  flaggedSortDirection: string;
  showQueryPreview: string;
  archiveSortDirection: string;
  inboxIncludesFlagged: string;
  preferredLightTheme: string;
  inboxSortFlaggedToTop: string;
  loadQueryFolder: string;
  loadActionGroupUUIDString: string;
  tagFilter: string;
  loadKeyboardGroupUUIDString: string;
  inboxSortMode: string;
  showPreview: string;
  archiveIncludesFlagged: string;
  tagFilterMode: string;
  showTags: string;
  allSortFlaggedToTop: string;
  showDate: string;
  allSortMode: string;
  queryString: string;
  name: string;
  dateRangeSpecifier: {
    endSpecifier: {
      specifierType: string;
      isEnabled: boolean;
      absolute: number;
      relativeDays: number;
      field: string;
    };
    startSpecifier: {
      isEnabled: boolean;
      specifierType: string;
      field: string;
      absolute: number;
      relativeDays: number;
    };
  };
  showLastAction: string;
  previewSize: string;
  archiveSortFlaggedToTop: string;
  allSortDirection: string;
  lastClonedKey: string;
  icon: string;
  inboxSortDirection: string;
  flaggedStatus: string;
  visibility: string;
  archiveSortMode: string;
  flaggedSortMode: string;
  key: string;
  preferredDarkTheme: string;
};

const DRAFTS_DB = DataBasePath.replace("~", homedir());

export async function getWorkspaces() {
  const dQuery = `
        SELECT
            ZVALUE as value
        FROM 
            ZMANAGEDSTORAGE
        WHERE 
            ZTYPE == "workspace"
        ORDER BY 
            ZSORT_INDEX ASC
        `;

  // Assuming executeSQL is a function that executes the SQL and returns results
  const rawData = await executeSQL<{ value: string }>(DRAFTS_DB, dQuery);

  if (!rawData || rawData.length === 0) {
    return [];
  }

  // Parse the JSON and map to Workspace objects
  const workspaces = rawData
    .map((row) => {
      try {
        return JSON.parse(row.value) as Workspace;
      } catch (error) {
        console.error("Failed to parse workspace JSON:", error);
        return null;
      }
    })
    .filter((workspace): workspace is Workspace => workspace !== null)
    .filter((workspace) => workspace.name.length > 0);

  // Use a Set to filter out duplicate workspace names
  const uniqueWorkspacesMap = new Map<string, Workspace>();
  for (const workspace of workspaces) {
    if (!uniqueWorkspacesMap.has(workspace.name)) {
      uniqueWorkspacesMap.set(workspace.name, workspace);
    }
  }

  return Array.from(uniqueWorkspacesMap.values());
}
