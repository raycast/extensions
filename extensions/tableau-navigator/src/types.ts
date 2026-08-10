// src/types.ts

// Type for settings from package.json, so that utils.ts can use it
export interface RaycastPreferences {
  tableauServerUrl: string;
  tableauApiVersion: string;
  personalAccessTokenName?: string;
  personalAccessTokenSecret?: string;
  tableauSiteId?: string;
}

export interface TableauTag {
  label: string;
}

export interface TableauProject {
  id: string;
  name?: string; // Name may not be returned if requesting project as part of another object without specifying project(fields=id,name)
}

export interface TableauOwner {
  id: string;
  name?: string; // Similar to project.name
  email?: string;
}

// Base type for Tableau elements (Workbook and View)
interface TableauItemBase {
  id: string; // Object LUID
  name: string;
  contentUrl: string; // Usually this is a "URL-friendly" name or path. For View it may be "WorkbookName/ViewName".
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
  tags?: { tag: TableauTag[] };
  project?: TableauProject; // May contain only ID if name is not requested or not returned
  owner?: TableauOwner; // May contain only ID
  itemType: "Workbook" | "View";
}

// Type for Workbook with all valid fields from API response
export interface TableauWorkbook extends TableauItemBase {
  itemType: "Workbook";
  description?: string;
  size?: string; // API usually returns size as a string (e.g., "12345")
  defaultViewId?: string; // LUID of the default view for this workbook
  hasExtracts?: boolean;
  sheetCount?: number; // Number of sheets (views) in the workbook
  showTabs?: boolean; // Whether to show sheet tabs
  shareDescription?: string; // (API returned this, but its purpose is unclear, possibly a typo for description)
  lastPublishedAt?: string; // ISO Date string
  primaryContentUrl?: string; // May be useful for building URLs if different from contentUrl
  // Fields that we also try to request, but they may not be in the base response:
  // project and owner are inherited from TableauItemBase
}

// Extract workbook reference into its own interface
export interface TableauWorkbookReference {
  id: string;
  name?: string;
  contentUrl?: string;
}

// Type for View with valid fields
export interface TableauView extends TableauItemBase {
  itemType: "View";
  workbook?: TableauWorkbookReference; // Use the extracted interface
  viewUrlName?: string; // "URL-friendly" name of the view, usually without workbook name. Useful for URLs.
  sheetType?: string; // Sheet type, for example, "Dashboard", "Worksheet", "Story"
  // project and owner are inherited from TableauItemBase
}

export interface ApiError {
  // Used in API responses
  code: string; // For example, "409004"
  summary: string; // For example, "Bad Request"
  detail: string; // Detailed error description
}
