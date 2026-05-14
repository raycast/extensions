import { getDatabases, runQuery } from "../lib/api";

const postgresDllQuery = `
    WITH t AS (SELECT table_name as name, jsonb_object_agg(column_name, data_type) as columns
               FROM information_schema.columns
               WHERE table_schema not in ('pg_catalog', 'information_schema')
               group by table_name),
         e AS (SELECT t.typname AS name, (SELECT jsonb_agg(enumlabel ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = t.oid) AS values
               FROM pg_type t
                        JOIN pg_namespace n ON t.typnamespace = n.oid
               WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
                 AND t.typtype = 'e'
                 AND t.typarray != 0)
    SELECT (SELECT jsonb_agg(t.*) FROM t) as tables,
           (SELECT jsonb_agg(e.*) FROM e) as enums;
`;

const ddlQueries: Record<string, string> = {
  postgres: postgresDllQuery,
};

export default async function () {
  const databases = await getDatabases();

  const promises = databases.map(async (database) => {
    const schema: { tables: { name: string; columns?: string[] }[]; enums?: { name: string; values: string[] }[] } = {
      tables: database.tables.map((table) => ({ name: table.name })),
    };

    // Get table schemas using DDL queries to improve query accuracy
    if (database.engine in ddlQueries) {
      try {
        const ddl = await runQuery({
          query: ddlQueries[database.engine],
          databaseId: database.id,
        });

        schema.tables = JSON.parse(ddl.rows[0][0]);
        if (ddl.rows[0][1]) {
          schema.enums = JSON.parse(ddl.rows[0][1]);
        }
      } catch {
        // Use the original tables if the DDL query fails
      }
    }

    return {
      id: database.id,
      name: database.name,
      engine: database.engine,
      schema,
    };
  });

  return {
    databases: await Promise.all(promises),
  };
}
