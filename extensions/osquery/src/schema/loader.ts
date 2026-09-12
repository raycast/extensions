import { OsquerySchema, OsqueryTable, Platform } from "./types";
import schema from "./schema-5.21.0.json";

export function getSchema(): OsquerySchema {
  return schema as OsquerySchema;
}

export function filterByPlatform(
  tables: OsquerySchema,
  platform: Platform,
): OsquerySchema {
  if (platform === "all") {
    return tables;
  }
  return tables.filter((table) => table.platforms.includes(platform));
}

export function searchTables(
  tables: OsquerySchema,
  query: string,
): OsquerySchema {
  if (!query.trim()) {
    return tables;
  }

  const lowerQuery = query.toLowerCase();

  return tables.filter((table) => {
    // Match table name
    if (table.name.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    // Match description
    if (table.description.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    // Match column names
    if (
      table.columns.some((col) => col.name.toLowerCase().includes(lowerQuery))
    ) {
      return true;
    }
    return false;
  });
}

export function getTableByName(name: string): OsqueryTable | undefined {
  return getSchema().find((table) => table.name === name);
}
