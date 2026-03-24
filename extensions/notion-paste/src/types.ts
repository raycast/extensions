/** A single property extracted from a Notion page, ready for display. */
export interface NotionProperty {
  name: string;
  value: string;
}

/** A Notion database record with pre-extracted property values. */
export interface NotionRecord {
  id: string;
  url: string;
  /** Value of the configured search/title property — used as the list item title. */
  title: string;
  /** Properties shown as accessories in the search result list. */
  displayProperties: NotionProperty[];
  /** Properties offered in the field picker after selecting a record. */
  pickerProperties: NotionProperty[];
}

/** Preferences shared across the entire extension (extension-level). */
export interface ExtensionPreferences {
  notionApiKey: string;
}

/** A configured Notion database entry for the multi-database command. */
export interface DatabaseConfig {
  label: string;
  databaseId: string;
  searchProperty: string;
  searchPropertyType: "title" | "rich_text";
  /** Raw comma-separated string from the preferences UI. */
  displayProperties: string;
  /** Raw comma-separated string from the preferences UI. */
  pickerProperties: string;
  /**
   * Optional. Property name used to pre-filter the database before searching
   * (e.g. "Status"). When empty, all records are shown.
   */
  filterProperty?: string;
  /** Type of the pre-filter property — "status" or "select". Defaults to "status". */
  filterPropertyType?: "status" | "select";
  /**
   * Optional. Raw comma-separated values for the pre-filter
   * (e.g. "Fixed, Nominated, Delivered"). When empty, no pre-filter is applied.
   */
  filterValues?: string;
}

/** Preferences that are set per-command. */
export interface CommandPreferences extends ExtensionPreferences {
  databaseId: string;
  searchProperty: string;
  searchPropertyType: "title" | "rich_text";
  /** Raw comma-separated string from the preferences UI. */
  displayProperties: string;
  /** Raw comma-separated string from the preferences UI. */
  pickerProperties: string;
  /**
   * Optional. Property name used to pre-filter the database before searching
   * (e.g. "Status"). When empty, all records are shown.
   */
  filterProperty: string;
  /** Type of the pre-filter property — "status" or "select". Defaults to "status". */
  filterPropertyType: "status" | "select";
  /**
   * Optional. Raw comma-separated values for the pre-filter
   * (e.g. "Fixed, Nominated, Delivered"). When empty, no pre-filter is applied.
   */
  filterValues: string;
}
