import { Client, isFullPage } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";
import type { NotionProperty, NotionRecord } from "./types";
import { parsePropertyList } from "./utils";

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export function createNotionClient(apiKey: string): Client {
  return new Client({ auth: apiKey });
}

// ---------------------------------------------------------------------------
// Property value extraction
// ---------------------------------------------------------------------------

/**
 * Extracts a human-readable string from any Notion property value type.
 * Returns an empty string for unsupported or empty properties.
 */
export function extractPropertyValue(
  prop: PageObjectResponse["properties"][string],
): string {
  switch (prop.type) {
    case "title":
      return prop.title.map((r) => r.plain_text).join("");

    case "rich_text":
      return prop.rich_text.map((r) => r.plain_text).join("");

    case "number":
      return prop.number !== null && prop.number !== undefined
        ? String(prop.number)
        : "";

    case "select":
      return prop.select?.name ?? "";

    case "multi_select":
      return prop.multi_select.map((s) => s.name).join(", ");

    case "status":
      return prop.status?.name ?? "";

    case "date":
      if (!prop.date) return "";
      return prop.date.end
        ? `${prop.date.start} → ${prop.date.end}`
        : prop.date.start;

    case "checkbox":
      return prop.checkbox ? "✓" : "✗";

    case "url":
      return prop.url ?? "";

    case "email":
      return prop.email ?? "";

    case "phone_number":
      return prop.phone_number ?? "";

    case "formula": {
      const f = prop.formula;
      switch (f.type) {
        case "string":
          return f.string ?? "";
        case "number":
          return f.number !== null && f.number !== undefined
            ? String(f.number)
            : "";
        case "boolean":
          return f.boolean !== null && f.boolean !== undefined
            ? f.boolean
              ? "✓"
              : "✗"
            : "";
        case "date":
          return f.date?.start ?? "";
        default:
          return "";
      }
    }

    case "rollup": {
      const r = prop.rollup;
      switch (r.type) {
        case "number":
          return r.number !== null && r.number !== undefined
            ? String(r.number)
            : "";
        case "date":
          return r.date?.start ?? "";
        case "array":
          return r.array
            .map((item) =>
              // Each array item is itself a property value — recurse
              extractPropertyValue(
                item as PageObjectResponse["properties"][string],
              ),
            )
            .filter(Boolean)
            .join(", ");
        default:
          return "";
      }
    }

    case "people":
      return prop.people
        .map((p) => ("name" in p && p.name ? p.name : "Unknown"))
        .join(", ");

    case "created_by":
      return "name" in prop.created_by && prop.created_by.name
        ? prop.created_by.name
        : "";

    case "last_edited_by":
      return "name" in prop.last_edited_by && prop.last_edited_by.name
        ? prop.last_edited_by.name
        : "";

    case "created_time":
      return formatIsoDate(prop.created_time);

    case "last_edited_time":
      return formatIsoDate(prop.last_edited_time);

    case "files":
      return prop.files
        .map((f) => ("name" in f ? f.name : ""))
        .filter(Boolean)
        .join(", ");

    case "relation":
      // Relations only expose page IDs without an extra API call — show count
      return prop.relation.length > 0
        ? `${prop.relation.length} linked page${prop.relation.length > 1 ? "s" : ""}`
        : "";

    case "unique_id":
      return prop.unique_id.prefix
        ? `${prop.unique_id.prefix}-${prop.unique_id.number}`
        : String(prop.unique_id.number ?? "");

    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Database search
// ---------------------------------------------------------------------------

/**
 * Builds an OR filter that restricts a property to a set of allowed values.
 * Returns undefined when no property name or values are provided.
 */
function buildPreFilter(
  filterProperty: string,
  filterPropertyType: "status" | "select",
  filterValues: string[],
): QueryDatabaseParameters["filter"] | undefined {
  if (!filterProperty.trim() || filterValues.length === 0) return undefined;

  const conditions = filterValues.map((value) =>
    filterPropertyType === "status"
      ? ({
          property: filterProperty,
          status: { equals: value },
        } as QueryDatabaseParameters["filter"])
      : ({
          property: filterProperty,
          select: { equals: value },
        } as QueryDatabaseParameters["filter"]),
  );

  // A single condition doesn't need wrapping in an `or`
  return conditions.length === 1
    ? conditions[0]
    : ({ or: conditions } as QueryDatabaseParameters["filter"]);
}

/**
 * Queries a Notion database with an optional text filter and an optional
 * pre-filter that restricts results to records with specific property values.
 *
 * - When `query` is empty, returns the 25 most recently edited records
 *   (subject to the pre-filter if configured).
 * - When `query` is provided, filters by the configured search property.
 * - When both a pre-filter and a search query are active, they are combined
 *   with a Notion `and` compound filter.
 */
export async function searchNotionDatabase(
  apiKey: string,
  databaseId: string,
  searchProperty: string,
  searchPropertyType: "title" | "rich_text",
  displayPropertiesRaw: string,
  pickerPropertiesRaw: string,
  query: string,
  filterProperty: string,
  filterPropertyType: "status" | "select",
  filterValuesRaw: string,
): Promise<NotionRecord[]> {
  const notion = createNotionClient(apiKey);

  const displayPropertyNames = parsePropertyList(displayPropertiesRaw);
  const pickerPropertyNames = parsePropertyList(pickerPropertiesRaw);

  // Search filter — applied only when the user has typed something
  const searchFilter: QueryDatabaseParameters["filter"] | undefined = query
    ? searchPropertyType === "title"
      ? { property: searchProperty, title: { contains: query } }
      : { property: searchProperty, rich_text: { contains: query } }
    : undefined;

  // Pre-filter — restricts the visible record set regardless of search text
  const preFilter = buildPreFilter(
    filterProperty,
    filterPropertyType,
    parsePropertyList(filterValuesRaw),
  );

  // Combine: both active → `and`; only one active → use it directly
  let filter: QueryDatabaseParameters["filter"] | undefined;
  if (preFilter && searchFilter) {
    filter = {
      and: [preFilter, searchFilter],
    } as QueryDatabaseParameters["filter"];
  } else {
    filter = preFilter ?? searchFilter;
  }

  const response = await notion.databases.query({
    database_id: databaseId,
    filter,
    page_size: 25,
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
  });

  return response.results.filter(isFullPage).map((page) => {
    const props = page.properties;

    // Title: value of the configured search property
    const titleProp = props[searchProperty];
    const title = titleProp ? extractPropertyValue(titleProp) : page.id;

    // Display properties (shown as list accessories)
    const displayProperties: NotionProperty[] = displayPropertyNames
      .filter((name) => name in props)
      .map((name) => ({
        name,
        value: extractPropertyValue(props[name]),
      }));

    // Picker properties (shown in the field picker view)
    const pickerProperties: NotionProperty[] = pickerPropertyNames
      .filter((name) => name in props)
      .map((name) => ({
        name,
        value: extractPropertyValue(props[name]),
      }));

    return {
      id: page.id,
      url: page.url,
      title: title || "(untitled)",
      displayProperties,
      pickerProperties,
    };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatIsoDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
