import { listColumns, listDatabases, listForeignKeys, listIndexes, listSchemas, listTables } from "../lib/client";
import { defaultConnectionWarning, resolveConnection } from "../lib/connections";

type Input = {
  /**
   * Which saved connection to run against — the profile name, or the database name. Omit it to use
   * the connection the user marked active, which is what they mean unless they said otherwise. Only
   * pass it when the request names a specific database or environment.
   */
  connection?: string;
  /** Restrict the result to one schema, e.g. "public". Omit to cover every non-system schema. */
  schema?: string;
  /**
   * Restrict the result to one table. When set, the answer contains that table's columns, indexes
   * and foreign keys; when omitted, it is the table list only, so the response stays small.
   */
  table?: string;
};

// Without a table, a wide database would otherwise return thousands of rows to the model.
const MAX_TABLES = 300;

/**
 * Describes the database structure. Called without a table it returns the table list (plus the
 * schemas), which is the cheap overview; called with one it returns that table's full definition.
 */
export default async function (input: Input) {
  const connection = await resolveConnection(input.connection);

  if (input.table) {
    const [columns, indexes, foreignKeys] = await Promise.all([
      listColumns(connection, input.schema, input.table),
      listIndexes(connection, input.schema, input.table),
      listForeignKeys(connection, input.schema, input.table),
    ]);
    if (columns.length === 0) {
      return {
        connection: connection.name,
        database: connection.database,
        error: `No table named "${input.table}"${input.schema ? ` in schema "${input.schema}"` : ""}. Call this tool without a table to see what exists.`,
      };
    }
    return {
      connection: connection.name,
      database: connection.database,
      warning: await defaultConnectionWarning(connection, Boolean(input.connection)),
      table: `${columns[0].schema}.${columns[0].table}`,
      columns: columns.map((column) => ({
        name: column.name,
        type: column.type,
        nullable: column.nullable,
        default: column.default,
        primaryKey: column.primaryKey,
        comment: column.comment,
      })),
      indexes: indexes.map((index) => ({
        name: index.name,
        definition: index.definition,
        unique: index.isUnique,
        primary: index.isPrimary,
        scans: index.scans,
      })),
      foreignKeys: {
        outgoing: foreignKeys.outgoing.map((fk) => fk.definition),
        incoming: foreignKeys.incoming.map((fk) => `${fk.fromSchema}.${fk.fromTable}: ${fk.definition}`),
      },
    };
  }

  const [schemas, tables] = await Promise.all([listSchemas(connection), listTables(connection, input.schema)]);

  // An empty result is nearly always the wrong database rather than an empty one — the server is
  // reachable, the credentials work, there is just nothing here. Naming the database that was
  // queried and the alternatives on the same server turns a dead end into an answer.
  if (tables.length === 0) {
    const databases = await listDatabases(connection).catch(() => []);
    const others = databases.filter((name) => name !== connection.database);
    return {
      connection: connection.name,
      database: connection.database,
      tables: [],
      hint:
        others.length > 0
          ? `The database "${connection.database}" on ${connection.host}:${connection.port} contains no tables. Other databases on the same server: ${others.join(", ")}. Tell the user they are probably connected to the wrong one, and that they can change it in the Manage Connections command.`
          : `The database "${connection.database}" on ${connection.host}:${connection.port} contains no tables.`,
    };
  }

  const truncated = tables.length > MAX_TABLES;
  return {
    connection: connection.name,
    database: connection.database,
    warning: await defaultConnectionWarning(connection, Boolean(input.connection)),
    schemas,
    truncated,
    tables: (truncated ? tables.slice(0, MAX_TABLES) : tables).map((table) => ({
      schema: table.schema,
      name: table.name,
      kind: table.kind,
      estimatedRows: table.estimatedRows,
      size: table.size,
      comment: table.comment,
    })),
  };
}
