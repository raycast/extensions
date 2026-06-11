import { Action, Tool } from "@raycast/api";
import { QueryResult } from "../lib/types";
import { explainQuery, listConnections } from "../lib/mcp";
import { loadConnections } from "../lib/connections";
import { isMutatingSQL, summarizeSQL } from "../lib/sql";

type Input = {
  /** UUID of the TablePro connection. */
  connectionId: string;
  /** SQL to explain. The tool wraps it with EXPLAIN before running. */
  sql: string;
  /** Database to scope the query to. Optional. */
  database?: string;
  /** Schema to scope the query to. Optional. */
  schema?: string;
};

export default async function tool(input: Input): Promise<QueryResult> {
  return explainQuery(input.connectionId, input.sql, {
    database: input.database,
    schema: input.schema,
  });
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!isMutatingSQL(input.sql)) {
    return undefined;
  }
  const connectionName = await resolveConnectionName(input.connectionId);
  const info: { name: string; value?: string }[] = [
    { name: "Connection", value: connectionName },
    { name: "SQL", value: summarizeSQL(input.sql) },
  ];
  if (input.database) info.push({ name: "Database", value: input.database });
  if (input.schema) info.push({ name: "Schema", value: input.schema });
  return {
    style: Action.Style.Destructive,
    message: `EXPLAIN may execute this statement on the server. Run it on ${connectionName}?`,
    info,
  };
};

async function resolveConnectionName(connectionId: string): Promise<string> {
  try {
    const list = await listConnections();
    const match = list.find((c) => c.id === connectionId);
    if (match) return match.name;
  } catch {
    // fall through to local file
  }
  try {
    const list = await loadConnections();
    const match = list.find((c) => c.id === connectionId);
    if (match) return match.name;
  } catch {
    // ignore
  }
  return connectionId;
}
