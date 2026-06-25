import { clampLimit, posthogRequest, truncateValue } from "../posthog-client";
import { requireAccountId, requireProjectId } from "../tool-auth";

type Input = {
  accountId?: string;
  projectId?: number;
  search?: string;
  /** Comma-separated table names to include. */
  tables?: string;
  includeColumns?: boolean;
  limitTables?: number;
  limitColumnsPerTable?: number;
};

type SchemaResponse = {
  result?: unknown;
  results?: unknown;
  columns?: string[];
  tables?: unknown[] | Record<string, unknown>;
};

function getTableName(table: unknown): string | undefined {
  if (typeof table === "string") return table;
  if (!table || typeof table !== "object") return undefined;

  const record = table as Record<string, unknown>;
  return String(record.name ?? record.table ?? record.id ?? "") || undefined;
}

function getColumns(table: unknown, limit: number) {
  if (!table || typeof table !== "object") return undefined;

  const record = table as Record<string, unknown>;
  const columns = record.columns ?? record.fields ?? record.properties;

  if (Array.isArray(columns)) return truncateValue(columns.slice(0, limit));
  if (columns && typeof columns === "object") return truncateValue(Object.entries(columns).slice(0, limit));

  return undefined;
}

function objectToTables(value: Record<string, unknown>): unknown[] {
  if (Array.isArray(value.tables)) return value.tables;
  if (value.tables && typeof value.tables === "object") return objectToTables(value.tables as Record<string, unknown>);

  return Object.entries(value).map(([name, table]) => {
    if (table && typeof table === "object") {
      return { name, ...(table as Record<string, unknown>) };
    }

    return { name, value: table };
  });
}

function extractSchemaTables(response: SchemaResponse): unknown[] {
  const candidates = [response.tables, response.results, response.result];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") return objectToTables(candidate as Record<string, unknown>);
  }

  return [];
}

export default async function tool({
  accountId,
  projectId,
  search,
  tables,
  includeColumns = true,
  limitTables,
  limitColumnsPerTable,
}: Input = {}) {
  const resolvedAccountId = requireAccountId(accountId);
  const resolvedProjectId = requireProjectId(projectId);
  const tableLimit = clampLimit(limitTables, 50, 200);
  const columnLimit = clampLimit(limitColumnsPerTable, 50, 200);

  const response = await posthogRequest<SchemaResponse>(resolvedAccountId, `projects/${resolvedProjectId}/query/`, {
    method: "POST",
    body: {
      query: {
        kind: "DatabaseSchemaQuery",
      },
    },
  });

  const rawTables = extractSchemaTables(response);
  const tableNameFilter = new Set(
    (tables?.split(",") ?? []).map((table) => table.trim().toLowerCase()).filter(Boolean),
  );
  const normalizedSearch = search?.toLowerCase();

  const filteredTables = rawTables
    .filter((table) => {
      const name = getTableName(table)?.toLowerCase();
      if (!name) return false;
      if (tableNameFilter.size && !tableNameFilter.has(name)) return false;
      if (normalizedSearch && !name.includes(normalizedSearch)) return false;
      return true;
    })
    .slice(0, tableLimit)
    .map((table) => ({
      name: getTableName(table),
      columns: includeColumns ? getColumns(table, columnLimit) : undefined,
    }));

  return {
    accountId: resolvedAccountId,
    projectId: resolvedProjectId,
    tables: filteredTables,
    returnedTables: filteredTables.length,
    totalTables: rawTables.length,
    truncated: rawTables.length > filteredTables.length,
  };
}
