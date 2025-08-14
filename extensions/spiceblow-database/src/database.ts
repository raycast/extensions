import { showToast, Toast } from "@raycast/api";
import Papa from "papaparse";

import mysql, { RowDataPacket, TypeCast } from "mysql2/promise";
import { types as pgTypes, Pool, PoolConfig } from "pg";
import { SQL, SQLStatement } from "sql-template-strings";
import dedent from "string-dedent";
import { notifyError } from "./raycast";
import { apiClient, NATURAL_LANGUAGE_SEARCH } from "./search-database";
import { useGlobalState } from "./state";
import { ColumnInfo, Json, launchContext, TableInfo } from "./types";
import { ellipsisReviver, generateRandomId, getDatabaseConnectionType, sleep } from "./utils";

// process.title = "Spiceblow";

// Override parsing of DATE, TIMESTAMP, and TIMESTAMPTZ types
void [pgTypes.builtins.DATE, pgTypes.builtins.TIMESTAMP, pgTypes.builtins.TIMESTAMPTZ].forEach((type) => {
  pgTypes.setTypeParser(type, (val) => val);
});

// Override parsing of TIME and TIMETZ types
void [pgTypes.builtins.TIME, pgTypes.builtins.TIMETZ].forEach((type) => {
  pgTypes.setTypeParser(type, (val) => val);
});

const postgresPoolOptions: PoolConfig = {
  max: 3,
};
let postgresPool = new Pool({
  ...postgresPoolOptions,
  connectionString: useGlobalState.getState().connectionString,
});
postgresPool.on("connect", () => {
  console.log("Acquired connection from pool");
});

// Ensure connections are released on process exit
process.on("exit", () => {
  console.log("Received exit, exiting gracefully");
  postgresPool.end();
  mysqlPool.end();
});

// Handle other termination signals
process.on("SIGINT", () => {
  console.log("Received SIGINT, exiting gracefully");
  postgresPool.end();
  mysqlPool.end();
  process.exit();
});
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, exiting gracefully");
  postgresPool.end();
  mysqlPool.end();
  process.exit();
});

const typeCast: TypeCast = function (field, next) {
  if (field.type === "DATE") {
    return field.string();
  }
  if (field.type === "TIMESTAMP" || field.type === "DATETIME") {
    return field.string();
  }
  if (field.type === "TIME") {
    return field.string();
  }
  return next();
};

const mysqlPoolOptions: mysql.PoolOptions = {
  typeCast,
  connectionLimit: 3,
};
let mysqlPool = mysql.createPool({
  ...mysqlPoolOptions,
  uri: useGlobalState.getState().connectionString,
});

export let databaseType: "postgres" | "mysql" =
  getDatabaseConnectionType(useGlobalState.getState().connectionString) || "postgres";
useGlobalState.subscribe((state) => {
  const type = getDatabaseConnectionType(state.connectionString);
  if (type === "postgres") {
    databaseType = "postgres";
    postgresPool.end();
    postgresPool = new Pool({
      ...postgresPoolOptions,
      connectionString: state.connectionString,
    });
    postgresPool.on("connect", () => {
      console.log("Acquired connection from pool");
    });
  } else if (type === "mysql") {
    databaseType = "mysql";
    mysqlPool.end();
    mysqlPool = mysql.createPool({
      ...mysqlPoolOptions,
      uri: state.connectionString,
    });
  }
});

export async function countTableRows(table: string) {
  if (databaseType === "postgres") {
    const [schema, tableName] = table.split(".");
    const result = await postgresPool.query(`SELECT COUNT(*) FROM "${schema}"."${tableName}"`);
    return result.rows[0].count;
  } else {
    const [database, tableName] = table.split(".");
    const [rows] = await mysqlPool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM \`${database}\`.\`${tableName}\``,
    );
    return rows[0].count;
  }
}

export async function checkConnection(connectionString: string, databaseType: "postgres" | "mysql") {
  if (databaseType === "postgres") {
    const pool = new Pool({
      connectionString,
    });
    try {
      if (connectionOk) {
        return true;
      }
      await pool.connect();
      connectionOk = true;
      pool.end();
      return true;
    } catch (error) {
      console.error("Error connecting to PostgreSQL database:", error);

      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Error",
        message: `Error connecting to PostgreSQL database: ${error.message}`,
      });
      return false;
    }
  } else {
    const pool = mysql.createPool({
      uri: connectionString,
    });
    try {
      if (connectionOk) {
        return true;
      }
      await pool.getConnection();
      pool.end();
      connectionOk = true;
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Error",
        message: `Error connecting to MySQL database: ${error.message}`,
      });
      return false;
    }
  }
}

export function renderColumnValue(col: ColumnInfo, value: Json) {
  if (value == null) {
    return "";
  }
  let text = String(value);
  // console.log(JSON.stringify(col, null, 2));
  if (databaseType === "postgres") {
    if (col.typeId === pgTypes.builtins.BYTEA) {
      text = "bytes";
    } else if (col.typeId === pgTypes.builtins.CHAR) {
      text = "byte";
    } else if (col.typeId === pgTypes.builtins.JSON || col.typeId === pgTypes.builtins.JSONB) {
      text = JSON.stringify(value, ellipsisReviver);
    } else if (col.typeId === pgTypes.builtins.XML) {
      text = "XML data";
    } else if (col.typeId === pgTypes.builtins.TSVECTOR) {
      text = "vector";
    } else if (col.typeId === pgTypes.builtins.INTERVAL) {
      text = String(value);
    } else {
      text = String(value);
    }
  } else {
    if (
      col.typeId === mysql.Types.BLOB ||
      col.typeId === mysql.Types.TINY_BLOB ||
      col.typeId === mysql.Types.MEDIUM_BLOB ||
      col.typeId === mysql.Types.LONG_BLOB
    ) {
      if (typeof value === "string") {
        text = value;
      } else {
        text = "bytes";
      }
    } else if (col.typeId === mysql.Types.JSON) {
      text = JSON.stringify(value, ellipsisReviver);
    } else {
      text = String(value);
    }
  }
  if (text?.startsWith("[object Object]")) {
    text = JSON.stringify(text, null, 2);
  }
  return text;
}

export function isSearchableColumn(col: ColumnInfo) {
  const postgresSearchableTypes = [
    pgTypes.builtins.TEXT,
    pgTypes.builtins.VARCHAR,
    pgTypes.builtins.UUID,
    pgTypes.builtins.DATE,
    pgTypes.builtins.TIMESTAMP,
    pgTypes.builtins.TIMESTAMPTZ,
    pgTypes.builtins.NUMERIC,
    pgTypes.builtins.INT2,
    pgTypes.builtins.INT4,
    pgTypes.builtins.INT8,
    pgTypes.builtins.FLOAT4,
    pgTypes.builtins.FLOAT8,
    pgTypes.builtins.BOOL,
    // pgTypes.builtins.JSON,
    // pgTypes.builtins.JSONB,
    pgTypes.builtins.TIME,
    pgTypes.builtins.TIMETZ,
    pgTypes.builtins.INTERVAL,
    pgTypes.builtins.CHAR,
    pgTypes.builtins.BPCHAR,
  ];
  const mysqlSearchableTypes = [
    mysql.Types.VARCHAR,
    mysql.Types.STRING, // MySQL doesn't have a specific UUID type, using STRING as a close approximation
    mysql.Types.DATE,
    mysql.Types.TIMESTAMP,
    mysql.Types.LONG, // For 'int'
    mysql.Types.LONGLONG, // For 'bigint'
    mysql.Types.FLOAT,
    mysql.Types.DOUBLE,
    mysql.Types.ENUM,
    mysql.Types.VAR_STRING,
    mysql.Types.STRING,
  ];

  if (databaseType === "postgres") {
    return postgresSearchableTypes.includes(col.typeId);
  } else {
    return mysqlSearchableTypes.includes(col.typeId);
  }
}

export type GenerateSearchConditionParams = {
  searchText?: string;
  tableInfo?: TableInfo;
  searchField?: string;
  signal?: AbortSignal;
  schema?: string;
  query?: string;
  namespace: string;
  previousOutputs: Array<{
    output: { whereClause: string; orderByClause: string | null; groupBy: string | null };
    error: string;
  }>;
};
let timesAborted = 0;

async function generateSearchCondition({
  searchField,
  searchText,
  tableInfo,
  schema,
  query,
  namespace,
  signal,
  previousOutputs,
}: GenerateSearchConditionParams): Promise<undefined | { data?: Json; sql: string }> {
  if (!searchText) {
    return;
  }
  // throttle search slower than default Raycast throttle
  // if user types fast (less than 200ms on each keystroke) you only wait 200ms for the query, otherwise wait more
  // do not wait if query is from a link click
  if (launchContext?.searchText !== searchText) {
    await sleep(timesAborted ? 400 : 200);
  }
  if (signal?.aborted) {
    timesAborted += 1;
    return;
  }
  if (!tableInfo) {
    return;
  }

  if (searchField === NATURAL_LANGUAGE_SEARCH) {
    const id = generateRandomId();
    console.time(`generateFilterFromText ${id}`);
    const { data, error } = await apiClient.spiceblow.api.generateFilterFromText.post(
      {
        schema: schema || "",
        tableInfo,
        searchText,
        databaseType: databaseType,
        query: query || "",
        namespace,
        previousOutputs,
      },
      { fetch: { signal } },
    );
    console.timeEnd(`generateFilterFromText ${id}`);
    if (error) {
      throw error;
    }
    const { sqlClause } = data;
    if (sqlClause) {
      showToast({ title: sqlClause, style: Toast.Style.Success });
    }

    return { sql: sqlClause || "", data };
  }
  if (!tableInfo) {
    return;
  }

  const textColumns = tableInfo.columns
    .filter((col) => {
      if (!searchField) {
        return isSearchableColumn(col);
      }
      return col.columnName === searchField;
    })
    .map((col) => {
      if (databaseType === "postgres") {
        if (
          col.typeId === pgTypes.builtins.UUID ||
          col.typeId === pgTypes.builtins.TIMESTAMP ||
          col.typeId === pgTypes.builtins.TIMESTAMPTZ
        ) {
          return `"${col.columnName}"::text ILIKE '%${searchText}%'`;
        }

        if (
          col.typeId === pgTypes.builtins.INT4 ||
          col.typeId === pgTypes.builtins.INT8 ||
          col.typeId === pgTypes.builtins.FLOAT4 ||
          col.typeId === pgTypes.builtins.FLOAT8
        ) {
          const maybeNumber = Number(searchText);
          if (isNaN(maybeNumber)) {
            return "";
          }
          return `"${col.columnName}" = ${searchText}`;
        } else if ([pgTypes.builtins.TEXT, pgTypes.builtins.VARCHAR, pgTypes.builtins.CHAR].includes(col.typeId)) {
          return `"${col.columnName}" ILIKE '%${searchText}%'`;
        }
      } else {
        if (col.typeId === mysql.Types.TIMESTAMP) {
          return `\`${col.columnName}\` LIKE '%${searchText}%'`;
        }
        if ([mysql.Types.LONG, mysql.Types.LONGLONG, mysql.Types.FLOAT, mysql.Types.DOUBLE].includes(col.typeId)) {
          const maybeNumber = Number(searchText);
          if (isNaN(maybeNumber)) {
            return "";
          }
          return `\`${col.columnName}\` = ${searchText}`;
        } else if ([mysql.Types.VARCHAR, mysql.Types.STRING].includes(col.typeId)) {
          return `\`${col.columnName}\` LIKE '%${searchText}%'`;
        }
      }
    })
    .filter((x) => x)
    .join(" OR ");
  if (textColumns) {
    const whereClause = `WHERE ${textColumns}`;

    return { sql: whereClause };
  } else {
    notifyError(new Error("No searchable columns found"));
    return;
  }
}

export type SearchTableRowsOrCustomQueryParams = Omit<
  GenerateSearchConditionParams,
  "namespace" | "previousOutputs"
> & {
  table?: string;
  page: number;
  pageSize?: number;
  signal?: AbortSignal;
  descending?: boolean;
};

interface GenerateOrderByParams {
  tableInfo?: TableInfo;
  tableName: string;
  schema: string;
  descending?: boolean;
}

function generateOrderByClause({ tableInfo, descending, tableName, schema }: GenerateOrderByParams): string {
  const creationDateColumns = [
    "created_at",
    "createdAt",
    "createdat",
    "creation_date",
    "creationdate",
    "date_created",
    "datecreated",
    "timestamp",
    "updated_at",
    "updatedAt",
    "updatedat",
    "modified_at",
    "modifiedAt",
    "modification_date",
  ];

  const postgresSortableTypes = [
    pgTypes.builtins.TIMESTAMP,
    pgTypes.builtins.DATE,
    pgTypes.builtins.TIMESTAMPTZ,
    pgTypes.builtins.TIME,
    pgTypes.builtins.TIMETZ,
    pgTypes.builtins.INT4,
    pgTypes.builtins.INT8,
    pgTypes.builtins.NUMERIC,
    pgTypes.builtins.FLOAT4,
    pgTypes.builtins.FLOAT8,
    pgTypes.builtins.INT2,
  ];
  const mysqlSortableTypes = [
    mysql.Types.DATETIME,
    mysql.Types.TIMESTAMP,
    mysql.Types.DATE,
    mysql.Types.TIME,
    mysql.Types.DECIMAL,
    mysql.Types.FLOAT,
    mysql.Types.DOUBLE,
    mysql.Types.INT24,
  ];

  const column = tableInfo?.columns.find((col) => {
    const lowerCaseColumnName = col.columnName.toLowerCase();
    if (!creationDateColumns.includes(lowerCaseColumnName)) return false;
    console.log(
      `Checking sortable type for column ${col.columnName} with type ID ${col.typeId} in ${databaseType} database`,
    );
    if (databaseType === "postgres" && !postgresSortableTypes.includes(col.typeId)) {
      console.log(`Column ${col.columnName} is not a sortable type in Postgres.`);
      return false;
    }
    if (databaseType === "mysql" && !mysqlSortableTypes.includes(col.typeId)) {
      console.log(`Column ${col.columnName} is not a sortable type in MySQL.`);
      return false;
    }
    return true;
  });

  if (!column) {
    return "";
  }

  if (databaseType === "postgres") {
    return `ORDER BY "${schema}"."${tableName}"."${column.columnName}" ${descending ? "DESC" : "ASC"}`;
  } else {
    return `ORDER BY \`${schema}\`.\`${tableName}\`.\`${column.columnName}\` ${descending ? "DESC" : "ASC"}`;
  }
}

export async function searchTableRowsOrCustomQuery({
  table,
  page,
  pageSize = 10,
  query,
  signal,
  descending = true,
  ...rest
}: SearchTableRowsOrCustomQueryParams): Promise<{
  hasMore: boolean;
  data: Json[];
  totalCount: number;
}> {
  const id = generateRandomId();

  const previousOutputs = [] as GenerateSearchConditionParams["previousOutputs"];
  let output;
  while (previousOutputs.length <= 3) {
    let finalQuery: string = "";
    try {
      const offset = page * pageSize;

      if (query) {
        query = query.trim().replace(/;$/, "");
        finalQuery = dedent`
          SELECT *
          FROM (
            ${query}
          ) ${databaseType === "postgres" ? "AS subquery" : "as subquery"}
        `;
      } else if (table) {
        const [schema, tableName] = table.split(".");
        if (!schema || !tableName) {
          throw new Error('Invalid table format. Expected "{schema}.{tableName}"');
        }

        finalQuery = dedent`
          SELECT * FROM ${databaseType === "postgres" ? `"${schema}"."${tableName}"` : `\`${schema}\`.\`${tableName}\``}
        `;
      } else {
        throw new Error("Either 'table' or 'query' must be defined.");
      }

      const searchCondition = await generateSearchCondition({
        ...rest,
        previousOutputs,
        signal,
        namespace: query ? "subquery" : "",
        query: finalQuery,
      });

      if (searchCondition?.sql) {
        output = searchCondition?.data;
        finalQuery += ` ${searchCondition.sql}`;
      } else if (table) {
        const [schema, tableName] = table.split(".");
        const orderBy = generateOrderByClause({ descending, schema, tableName, tableInfo: rest.tableInfo });
        finalQuery += " " + orderBy;
      }

      finalQuery += databaseType === "postgres" ? ` LIMIT $1 OFFSET $2;` : ` LIMIT ? OFFSET ?;`;

      if (signal?.aborted) {
        return {
          hasMore: false,
          data: [],
          totalCount: 0,
        };
      }

      let result;
      console.time(`query ${id}`);
      if (databaseType === "postgres") {
        const client = await postgresPool.connect();
        try {
          result = await client.query(finalQuery, [pageSize + 1, offset]);
          const totalCount = offset + result.rows.length;
          const hasMore = result.rows.length > pageSize;
          const data = result.rows.slice(0, pageSize);
          console.timeEnd(`query ${id}`);
          return {
            hasMore,
            data,
            totalCount,
          };
        } finally {
          client.release();
        }
      } else {
        const connection = await mysqlPool.getConnection();
        try {
          // allow GROUP BY without aggregate functions for current connection
          await connection.query(`SET SESSION sql_mode='';`);
          const [rows] = await connection.query<RowDataPacket[]>(finalQuery, [pageSize + 1, offset]);
          const totalCount = offset + rows.length;
          const hasMore = rows.length > pageSize;
          const data = rows.slice(0, pageSize);
          console.timeEnd(`query ${id}`);
          return {
            hasMore,
            data,
            totalCount,
          };
        } finally {
          connection.release();
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Query was aborted");
        throw error;
      } else {
        console.error("Error in searchTableRowsOrCustomQuery:", error);
        console.error(finalQuery);
        if (rest.searchField !== NATURAL_LANGUAGE_SEARCH) {
          throw error;
        }
        previousOutputs.push({ output, error: error.message });
        showToast({
          title: `Sql error ${previousOutputs.length + 1}, retrying...`,
          message: error.message,
          style: Toast.Style.Failure,
        });
      }
    }
  }
  throw new Error(previousOutputs[previousOutputs.length - 1].error);
}

let connectionOk = false;
export async function getAllTablesInfo() {
  try {
    if (databaseType === "postgres") {
      const query = `
        WITH table_columns AS (
          SELECT 
            table_schema || '.' || table_name AS schema_table,
            array_agg(column_name ORDER BY ordinal_position)::text[] as columns
          FROM information_schema.columns
          GROUP BY table_schema, table_name
        )
        SELECT 
          t.table_schema || '.' || t.table_name AS schema_table,
          t.table_schema,
          tc.columns,
          (SELECT reltuples::bigint AS estimate
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = t.table_schema AND c.relname = t.table_name) AS estimated_row_count,
          (SELECT GREATEST(last_vacuum, last_autovacuum, last_analyze, last_autoanalyze)
           FROM pg_stat_user_tables
           WHERE schemaname = t.table_schema AND relname = t.table_name) AS last_updated
        FROM information_schema.tables t
        LEFT JOIN table_columns tc ON tc.schema_table = t.table_schema || '.' || t.table_name
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY 
          CASE WHEN t.table_schema = 'public' THEN 0 ELSE 1 END,
          t.table_schema,
          last_updated DESC NULLS LAST;
      `;
      const result = await postgresPool.query(query);

      const tables = result.rows.map((row) => ({
        schemaTable: row.schema_table,
        columns: row.columns || [],
        estimatedRowCount: Math.max(parseInt(row.estimated_row_count), 0),
        lastUpdated: row.last_updated ? new Date(row.last_updated) : null,
      }));

      return tables;
    } else {
      const tablesQuery = `
        SELECT 
          table_schema AS database_name,
          table_name as table_name,
          CONCAT(table_schema, '.', table_name) AS schema_table,
          table_rows AS estimated_row_count,
          update_time AS last_updated
        FROM information_schema.tables
        WHERE table_schema NOT IN ('mysql', 'information_schema', 'performance_schema', 'sys', '_vt')
        ORDER BY 
          table_schema,
          update_time DESC;
      `;

      const [rows] = await mysqlPool.query<RowDataPacket[]>(tablesQuery);

      const tables = rows.map((row) => ({
        schemaTable: row.schema_table,
        columns: row.columns ? row.columns.split(",") : [],
        estimatedRowCount: Math.max(parseInt(row.estimated_row_count), 0),
        lastUpdated: row.last_updated ? new Date(row.last_updated) : null,
      }));

      return tables;
    }
  } catch (error) {
    notifyError(error);
    throw error;
  }
}

function validateTableInfo(tableInfo: TableInfo) {
  if (!tableInfo.columns.length) {
    throw new Error("Table has no columns");
  }
  for (const col of tableInfo.columns) {
    if (!col.columnName) {
      console.warn(`Column has no name: ${col.columnName}`);
    }
    if (!col.schemaName) {
      console.warn(`Column has no schema name: ${col.columnName}`);
    }
    if (!col.tableName) {
      console.warn(`Column has no table name: ${col.columnName}`);
    }
    if (!col.originalColumnName) {
      console.warn(`No originalColumnName: ${col.columnName}`);
    }
    if (!col.type) {
      throw new Error("Column has no type");
    }

    if (col.typeId == null) {
      throw new Error("Column has no typeId");
    }
  }
  for (const relation of tableInfo.relations || []) {
    if (!relation.direction) {
      throw new Error("Relation has no direction");
    }
    if (!relation.foreignSchema) {
      throw new Error("Relation has no foreign schema");
    }
    if (!relation.foreignTable) {
      throw new Error("Relation has no foreign table");
    }
    if (!relation.columnNames?.length) {
      throw new Error("Relation has no column names");
    }
    if (!relation.foreignColumnNames?.length) {
      throw new Error("Relation has no foreign column names");
    }
  }
  return tableInfo;

  // const primaryKeyColumns = tableInfo.columns.filter((col) => col.isPrimaryKey);
  // if (!primaryKeyColumns.length) {
  //   throw new Error("Table has no primary key");
  // }
}
export async function getTableInfo({ table }: { table: string }) {
  console.log(`getting table info for ${table}`);
  if (databaseType === "postgres") {
    const [schemaName, tableName] = table.split(".");

    // Get column information including enum types
    const columnQuery = `
      SELECT 
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
        a.atttypid AS data_type_id,
        a.attnotnull AS is_nullable,
        (SELECT pg_catalog.pg_get_expr(d.adbin, d.adrelid)
         FROM pg_catalog.pg_attrdef d
         WHERE d.adrelid = a.attrelid AND d.adnum = a.attnum AND a.atthasdef) AS column_default,
        CASE WHEN p.contype = 'p' THEN true ELSE false END AS is_primary_key,
        CASE WHEN i.indisunique AND i.indisprimary IS NOT TRUE THEN true ELSE false END AS is_unique,
        CASE 
          WHEN t.typtype = 'e' THEN 
            (SELECT array_agg(e.enumlabel)::text[]
             FROM pg_enum e 
             WHERE e.enumtypid = a.atttypid)
        END AS enum_values
      FROM pg_catalog.pg_attribute a
      LEFT JOIN pg_catalog.pg_constraint p ON p.conrelid = a.attrelid AND a.attnum = ANY(p.conkey) AND p.contype = 'p'
      LEFT JOIN pg_catalog.pg_index i ON i.indrelid = a.attrelid AND a.attnum = ANY(i.indkey)
      LEFT JOIN pg_catalog.pg_type t ON t.oid = a.atttypid
      WHERE a.attrelid = $1::regclass
        AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum;
    `;

    // Get related tables (both foreign keys and references)
    const relationsQuery = `
      WITH RECURSIVE fk_tree AS (
        -- Outbound foreign keys (direct)
        SELECT 
          'outbound' as direction,
          c.conname as constraint_name,
          nf.nspname as foreign_schema,
          cf.relname as foreign_table,
          ARRAY[a.attname]::text[] as column_names,
          ARRAY[af.attname]::text[] as foreign_column_names
        FROM pg_constraint c
        JOIN pg_class cp ON c.conrelid = cp.oid
        JOIN pg_namespace np ON cp.relnamespace = np.oid
        JOIN pg_class cf ON c.confrelid = cf.oid
        JOIN pg_namespace nf ON cf.relnamespace = nf.oid
        JOIN pg_attribute a ON a.attrelid = cp.oid AND a.attnum = ANY(c.conkey)
        JOIN pg_attribute af ON af.attrelid = cf.oid AND af.attnum = ANY(c.confkey)
        WHERE c.contype = 'f'
          AND cp.relname = $1 
          AND np.nspname = $2

        UNION ALL

        -- Inbound foreign keys (reverse)
        SELECT 
          'inbound' as direction,
          c.conname as constraint_name,
          np.nspname as foreign_schema,
          cp.relname as foreign_table,
          ARRAY[af.attname]::text[] as column_names,
          ARRAY[a.attname]::text[] as foreign_column_names
        FROM pg_constraint c
        JOIN pg_class cp ON c.conrelid = cp.oid
        JOIN pg_namespace np ON cp.relnamespace = np.oid
        JOIN pg_class cf ON c.confrelid = cf.oid
        JOIN pg_namespace nf ON cf.relnamespace = nf.oid
        JOIN pg_attribute a ON a.attrelid = cp.oid AND a.attnum = ANY(c.conkey)
        JOIN pg_attribute af ON af.attrelid = cf.oid AND af.attnum = ANY(c.confkey)
        WHERE c.contype = 'f'
          AND cf.relname = $1
          AND nf.nspname = $2
      )
      SELECT
        direction,
        constraint_name,
        foreign_schema,
        foreign_table,
        column_names,
        foreign_column_names
      FROM fk_tree;
    `;

    const [columnResult, relationsResult] = await Promise.all([
      postgresPool.query(columnQuery, [`"${schemaName}"."${tableName}"`]),
      postgresPool.query(relationsQuery, [tableName, schemaName]),
    ]);

    // Combine all information
    const tableInfo = validateTableInfo({
      columns: columnResult.rows.map((col) => {
        const columnName = col.column_name;
        return {
          columnName,
          schemaName,
          type: col.data_type,
          typeId: col.data_type_id,
          originalColumnName: columnName,
          tableName,
          isNullable: !col.is_nullable,
          defaultValue: col.column_default,
          isPrimaryKey: col.is_primary_key,
          isUnique: col.is_unique,
          enumValues: col.enum_values || null,
        };
      }),
      relations: relationsResult.rows.map((rel) => ({
        direction: rel.direction,
        constraintName: rel.constraint_name,
        foreignSchema: rel.foreign_schema,
        foreignTable: rel.foreign_table,
        columnNames: rel.column_names,
        foreignColumnNames: rel.foreign_column_names,
      })),
    });

    return tableInfo;
  } else {
    const [databaseName, tableName] = table.split(".");

    // First query to get basic column info
    const columnQuery = `
      SELECT 
        c.column_name as column_name,
        c.data_type as data_type,
        c.is_nullable as is_nullable,
        c.column_default as column_default,
        c.table_schema as table_schema,
        c.column_type as column_type,
        CASE WHEN c.column_key IN ('PRI', 'UNI') THEN 1 ELSE 0 END AS is_primary_key
      FROM information_schema.columns c
      WHERE c.table_schema = ? AND c.table_name = ?
      ORDER BY c.ordinal_position;
    `;

    // Query to get related tables
    const relationsQuery = `
      SELECT 
        'outbound' as direction,
        kcu.constraint_name,
        kcu.referenced_table_schema as foreign_schema,
        kcu.referenced_table_name as foreign_table,
        GROUP_CONCAT(kcu.column_name) as column_names,
        GROUP_CONCAT(kcu.referenced_column_name) as foreign_column_names
      FROM information_schema.key_column_usage kcu
      WHERE kcu.table_schema = ? 
        AND kcu.table_name = ?
        AND kcu.referenced_table_name IS NOT NULL
      GROUP BY kcu.constraint_name, kcu.referenced_table_schema, kcu.referenced_table_name
      UNION ALL
      SELECT 
        'inbound' as direction,
        kcu.constraint_name,
        kcu.table_schema as foreign_schema,
        kcu.table_name as foreign_table,
        GROUP_CONCAT(kcu.referenced_column_name) as column_names,
        GROUP_CONCAT(kcu.column_name) as foreign_column_names
      FROM information_schema.key_column_usage kcu
      WHERE kcu.referenced_table_schema = ?
        AND kcu.referenced_table_name = ?
        AND kcu.referenced_table_name IS NOT NULL
      GROUP BY kcu.constraint_name, kcu.table_schema, kcu.table_name;
    `;

    const [[columns], [relations]] = await Promise.all([
      mysqlPool.query<RowDataPacket[]>(columnQuery, [databaseName, tableName]),
      mysqlPool.query<RowDataPacket[]>(relationsQuery, [databaseName, tableName, databaseName, tableName]),
    ]);

    const tableInfo = validateTableInfo({
      columns: columns.map((col) => {
        const enumValues =
          col.data_type === "enum" && col.column_type
            ? col.column_type
                .substring(5, col.column_type.length - 1)
                .split(",")
                .map((v: string) => v.replace(/^'|'$/g, "").trim())
            : null;

        return {
          columnName: col.column_name,
          originalColumnName: col.column_name || tableName,
          schemaName: col.table_schema || databaseName,
          tableName: col.table_name || tableName,
          type: col.data_type,
          typeId: Number(mysql.Types[col.data_type.toUpperCase() as keyof typeof mysql.Types]),
          isNullable: col.is_nullable === "YES",
          defaultValue: col.column_default,
          isPrimaryKey: col.is_primary_key,
          enumValues,
        };
      }),
      relations: relations.map((rel) => ({
        direction: rel.direction,
        constraintName: rel.constraint_name,
        foreignSchema: rel.foreign_schema,
        foreignTable: rel.foreign_table,
        columnNames: rel.column_names?.split?.(","),
        foreignColumnNames: rel.foreign_column_names?.split?.(","),
      })),
    });

    return tableInfo;
  }
}

async function getTableAndColumnNamesForPostgres(fields: { tableID: number; columnID: number }[]) {
  if (databaseType !== "postgres") {
    throw new Error("Not a Postgres database");
  }
  const tableIDs = fields.map((field) => field.tableID).filter((id): id is number => id !== undefined);

  const tableNameQuery = `
      SELECT pg_class.oid AS table_id, relname AS table_name, nspname AS schema_name
      FROM pg_class
      JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
      WHERE pg_class.oid IN (${tableIDs.join(",")});
    `;

  const columnNameQuery = `
      SELECT attrelid AS table_id, attnum AS column_id, attname AS column_name
      FROM pg_attribute
      WHERE (attrelid, attnum) IN (${fields.map(({ tableID, columnID }) => `(${tableID}, ${columnID})`).join(",")});
    `;

  const [tableResults, columnResults] = await Promise.all([
    postgresPool.query(tableNameQuery),
    postgresPool.query(columnNameQuery),
  ]);

  const tableInfo = tableResults.rows.reduce((acc, row) => {
    acc[row.table_id] = { tableName: row.table_name, schemaName: row.schema_name };
    return acc;
  }, {});

  const columnNames = columnResults.rows.reduce((acc, row) => {
    if (!acc[row.table_id]) acc[row.table_id] = {};
    acc[row.table_id][row.column_id] = row.column_name;
    return acc;
  }, {});

  return fields.map((field) => {
    const { tableID, columnID } = field;
    const table = tableID ? tableInfo[tableID] : undefined;
    const columnName = columnID ? columnNames[tableID]?.[columnID] : undefined;

    return {
      ...field,
      tableName: table?.tableName,
      schemaName: table?.schemaName,
      columnName,
    };
  });
}

function getBestField(tableInfo: TableInfo) {
  const identifiableFields = tableInfo.columns.filter((column) => {
    if (databaseType === "postgres") {
      // For PostgreSQL
      return (
        column.isPrimaryKey ||
        column.typeId === pgTypes.builtins.TEXT ||
        column.typeId === pgTypes.builtins.VARCHAR ||
        column.typeId === pgTypes.builtins.UUID ||
        column.typeId === pgTypes.builtins.INT2 ||
        column.typeId === pgTypes.builtins.INT4 ||
        column.typeId === pgTypes.builtins.INT8
      );
    } else {
      // For MySQL
      return (
        column.isPrimaryKey ||
        column.typeId === mysql.Types.VARCHAR ||
        column.typeId === mysql.Types.STRING ||
        column.typeId === mysql.Types.VAR_STRING ||
        column.typeId === mysql.Types.LONG ||
        column.typeId === mysql.Types.LONGLONG
      );
    }
  });

  if (identifiableFields.length > 0) {
    return identifiableFields[0].columnName;
  }

  // If no identifiable field is found, return the first column name
  return tableInfo.columns[0].columnName;
}

export async function testGeneratedQuery(sqlCode: string) {
  // Remove the last semicolon from sqlCode if present
  sqlCode = sqlCode.trim().replace(/;$/, "");

  const hasLimit = /\bLIMIT\s+\d+/i.test(sqlCode);
  const limitedSqlCode = hasLimit ? sqlCode : `${sqlCode} LIMIT 5;`;

  if (databaseType === "postgres") {
    const client = await postgresPool.connect();
    await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;");
    try {
      const result = await client.query(limitedSqlCode);

      const names = await getTableAndColumnNamesForPostgres(result.fields);

      const tableInfo = validateTableInfo({
        columns: result.fields.map((field) => {
          const found = names.find((x) => x.columnID === field.columnID && x.tableID === field.tableID);
          if (!found) throw new Error("Could not find table and column names");

          const { tableName, columnName: originalColumnName, schemaName } = found;
          return {
            columnName: field.name,
            tableName,
            originalColumnName,
            schemaName,
            typeId: field.dataTypeID,
            type: getFieldType(field.dataTypeID),
            isNullable: true,
            defaultValue: null,
            isPrimaryKey: false,
          };
        }),
      });
      const bestField = getBestField(tableInfo);
      // console.log('tableInfo', tableInfo)
      const rows = result.rows;
      return {
        rows,
        tableInfo,
        fieldsCount: result.fields.length,
        bestField,
        rowsCount: rows.length,
        originalQuery: sqlCode,
      };
    } catch (e) {
      console.log("sql had error\n", limitedSqlCode);
      throw e;
    } finally {
      await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE;");
      client.release();
    }
  } else {
    const connection = await mysqlPool.getConnection();
    // set read only mode and allow GROUP BY queries without aggregate functions
    await connection.query(`SET SESSION TRANSACTION READ ONLY;`);
    await connection.query(`SET SESSION sql_mode='';`);
    try {
      const [rows, fields] = await connection.query<RowDataPacket[]>(`${limitedSqlCode}`);
      const tableInfo = validateTableInfo({
        columns: fields.map((field) => {
          console.log("field", field);
          const res: ColumnInfo = {
            columnName: field.name,
            schemaName: field.schema || "",
            originalColumnName: field.orgName,
            tableName: field.orgTable,
            typeId: field.columnType!,
            type: getFieldType(field.columnType!),
            isNullable: true,
            defaultValue: null,
            isPrimaryKey: false,
          };

          return res;
        }),
      });
      const bestField = getBestField(tableInfo);
      return {
        rows,
        tableInfo,
        fieldsCount: fields.length,
        bestField,
        rowsCount: rows.length,
        originalQuery: sqlCode,
      };
    } finally {
      await connection.query(`SET SESSION TRANSACTION READ WRITE`);
      connection.release();
    }
  }
}
export async function getDatabaseSchema({
  schemas = [],
  tables: filterTables = [],
}: {
  schemas: string[];
  tables?: string[];
}) {
  try {
    if (!schemas.length) {
      return "";
    }
    if (databaseType === "postgres") {
      const schemaPromises = schemas.map(async (schema) => {
        // Query to get all tables in the current schema
        const tableQuery = `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = $1
            AND table_type = 'BASE TABLE';
        `;
        const tableResult = await postgresPool.query(tableQuery, [schema]);
        const tables: string[] = tableResult.rows
          .map((row) => row.table_name)
          .filter((table) => !filterTables.length || filterTables.includes(table));

        const tablePromises = tables.map(async (table) => {
          // Query to get column definitions
          const columnQuery = `
            SELECT column_name, data_type, character_maximum_length, 
                   is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position;
          `;
          const columnResult = await postgresPool.query(columnQuery, [schema, table]);

          // Query to get foreign key constraints
          const foreignKeyQuery = `
            SELECT
              kcu.column_name,
              ccu.table_schema AS foreign_table_schema,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
            FROM 
              information_schema.table_constraints AS tc 
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name=$1 AND tc.table_schema=$2;
          `;
          const foreignKeyResult = await postgresPool.query(foreignKeyQuery, [table, schema]);

          // Construct CREATE TABLE statement
          let createTableStatement = `CREATE TABLE ${quote(schema)}.${quote(table)} (\n`;

          columnResult.rows.forEach((column, index) => {
            createTableStatement += `  ${quote(column.column_name)} ${column.data_type}`;

            if (column.character_maximum_length) {
              createTableStatement += `(${column.character_maximum_length})`;
            }

            if (column.is_nullable === "NO") {
              createTableStatement += " NOT NULL";
            }

            if (column.column_default) {
              createTableStatement += ` DEFAULT ${column.column_default}`;
            }

            if (index < columnResult.rows.length - 1) {
              createTableStatement += ",";
            }

            createTableStatement += "\n";
          });

          // Add foreign key constraints
          foreignKeyResult.rows.forEach((fk) => {
            createTableStatement += `,  FOREIGN KEY (${quote(fk.column_name)}) REFERENCES ${quote(fk.foreign_table_schema)}.${quote(fk.foreign_table_name)}(${quote(fk.foreign_column_name)})\n`;
          });

          createTableStatement += ");";

          return createTableStatement;
        });

        const tableSchemas = await Promise.all(tablePromises);
        return tableSchemas.join("\n\n");
      });

      const schemaResults = await Promise.all(schemaPromises);
      const fullSchema = schemaResults.join("\n\n");

      return fullSchema.trim();
    } else {
      const schemaPromises = schemas.map(async (schema) => {
        const tableQuery = `
          SELECT table_name as table_name
          FROM information_schema.tables
          WHERE table_schema = ?
            AND table_type = 'BASE TABLE';
        `;
        const [tables] = await mysqlPool.query<RowDataPacket[]>(tableQuery, [schema]);
        const tableNames = tables
          .map((row) => row.table_name)
          .filter((table) => !filterTables.length || filterTables.includes(table));

        const tablePromises = tableNames.map(async (table) => {
          const columnQuery = `
            SELECT column_name AS column_name, data_type AS data_type, 
                   character_maximum_length AS character_maximum_length, 
                   is_nullable AS is_nullable, column_default AS column_default
            FROM information_schema.columns
            WHERE table_schema = ? AND table_name = ?
            ORDER BY ordinal_position;
          `;
          const [columns] = await mysqlPool.query<RowDataPacket[]>(columnQuery, [schema, table]);

          const foreignKeyQuery = `
            SELECT
              column_name AS column_name,
              referenced_table_schema AS foreign_table_schema,
              referenced_table_name AS foreign_table_name,
              referenced_column_name AS foreign_column_name
            FROM 
              information_schema.key_column_usage
            WHERE table_schema = ? AND table_name = ? AND referenced_table_name IS NOT NULL;
          `;
          const [foreignKeys] = await mysqlPool.query<RowDataPacket[]>(foreignKeyQuery, [schema, table]);

          let createTableStatement = `CREATE TABLE ${quote(schema)}.${quote(table)} (\n`;

          columns.forEach((column, index) => {
            createTableStatement += `  ${quote(column.column_name)} ${column.data_type}`;

            if (column.character_maximum_length) {
              createTableStatement += `(${column.character_maximum_length})`;
            }

            if (column.is_nullable === "NO") {
              createTableStatement += " NOT NULL";
            }

            if (column.column_default) {
              createTableStatement += ` DEFAULT ${column.column_default}`;
            }

            if (index < columns.length - 1) {
              createTableStatement += ",";
            }

            createTableStatement += "\n";
          });

          foreignKeys.forEach((fk) => {
            createTableStatement += `,  FOREIGN KEY (${quote(fk.column_name)}) REFERENCES ${quote(fk.foreign_table_schema)}.${quote(fk.foreign_table_name)}(${quote(fk.foreign_column_name)})\n`;
          });

          createTableStatement += ");";

          return createTableStatement;
        });

        const tableSchemas = await Promise.all(tablePromises);
        return tableSchemas.join("\n\n");
      });

      const schemaResults = await Promise.all(schemaPromises);
      const fullSchema = schemaResults.join("\n\n");

      return fullSchema.trim();
    }
  } catch (e) {
    notifyError(e);
  } finally {
    // Any cleanup code if needed
  }
}

export function getFieldType(dataTypeID: number) {
  if (databaseType === "postgres") {
    switch (dataTypeID) {
      case pgTypes.builtins.BYTEA:
        return "bytea";
      case pgTypes.builtins.INT8:
        return "int8";
      case pgTypes.builtins.INT2:
        return "int2";
      case pgTypes.builtins.INT4:
        return "int4";
      case pgTypes.builtins.FLOAT4:
        return "float4";
      case pgTypes.builtins.FLOAT8:
        return "float8";
      case pgTypes.builtins.VARCHAR:
        return "varchar";
      case pgTypes.builtins.TEXT:
        return "text";
      case pgTypes.builtins.DATE:
        return "date";
      case pgTypes.builtins.TIMESTAMP:
        return "timestamp";
      case pgTypes.builtins.TIMESTAMPTZ:
        return "timestamptz";
      default:
        return "datatype " + dataTypeID;
    }
  } else {
    switch (dataTypeID) {
      case mysql.Types.BLOB:
        return "blob";
      case mysql.Types.LONGLONG:
        return "bigint";
      case mysql.Types.LONG:
        return "int";
      case mysql.Types.FLOAT:
        return "float";
      case mysql.Types.DOUBLE:
        return "double";
      case mysql.Types.VARCHAR:
        return "varchar";
      case mysql.Types.STRING:
        return "char";
      case mysql.Types.VAR_STRING:
        return "varchar";
      case mysql.Types.DATE:
        return "date";
      case mysql.Types.TIMESTAMP:
        return "timestamp";
      case mysql.Types.DATETIME:
        return "datetime";
      case mysql.Types.TIME:
        return "time";
      case mysql.Types.TINY:
        return "tinyint";
      case mysql.Types.SHORT:
        return "smallint";
      case mysql.Types.YEAR:
        return "year";
      case mysql.Types.NEWDECIMAL:
        return "decimal";
      case mysql.Types.GEOMETRY:
        return "geometry";
      default:
        return "datatype " + dataTypeID;
    }
  }
}

export type TableRowUpdateParams = {
  updateColumns: string[];
  allValues: Array<ColumnInfo & { value: Json; oldValue: Json }>;
};

export type TableRowDeleteParams = {
  allValues: Array<ColumnInfo & { oldValue: Json }>;
};

export async function prepareTableRowDelete(params: TableRowDeleteParams) {
  const findResults = await findRowsForUpdate(params);
  const finalDeleteQueries = [] as SQLStatement[];

  for (const result of findResults) {
    if (result.error !== undefined) {
      throw new Error(result.error);
    }
    const { schema, table, whereClause } = result;

    const deleteQuery = SQL``;
    if (databaseType === "postgres") {
      deleteQuery.append(`DELETE FROM "${schema}"."${table}"\n`);
    } else {
      deleteQuery.append(`DELETE FROM \`${schema}\`.\`${table}\`\n`);
    }
    deleteQuery.append(`WHERE `);

    deleteQuery.append(whereClause);
    deleteQuery.append(`;`);

    finalDeleteQueries.push(deleteQuery);
  }

  return { queryText: finalDeleteQueries.map((x) => x.text).join("\n\n"), deleteQueries: finalDeleteQueries };
}

type FindResult =
  | {
      schema: string;
      table: string;
      whereClause: SQLStatement;
      error?: undefined;
    }
  | {
      schema: string;
      table: string;
      error: string;
      whereClause: SQLStatement;
    };

export async function findRowsForUpdate({ allValues }: TableRowDeleteParams) {
  const tableGroups = new Map<string, (typeof allValues)[number][]>();

  for (const field of allValues) {
    if (!field.schemaName || !field.tableName) {
      continue;
    }
    const key = `${field.schemaName}.${field.tableName}`;
    if (!tableGroups.has(key)) {
      tableGroups.set(key, []);
    }
    tableGroups.get(key)!.push(field);
  }

  const findResults: FindResult[] = [];

  for (const [tableName, all] of tableGroups) {
    const [schema, table] = tableName.split(".");
    if (!schema || !table) {
      throw new Error(`Invalid table name format for "${tableName}". Expected "schema.table"`);
    }

    const findQuery = SQL``;
    if (databaseType === "postgres") {
      findQuery.append(`SELECT * FROM "${schema}"."${table}" WHERE `);
    } else {
      findQuery.append(`SELECT * FROM \`${schema}\`.\`${table}\` WHERE `);
    }

    const whereClause = SQL``;

    const filterable = all.filter((item) => {
      if (item.oldValue == null) {
        return false;
      }

      if (item.isPrimaryKey) {
        return true;
      }

      return isSearchableColumn(item);
    });
    for (const [i, item] of filterable.entries()) {
      if (databaseType === "postgres") {
        whereClause.append(`"${item.originalColumnName}" = `);
      } else {
        whereClause.append(`\`${item.originalColumnName}\` = `);
      }
      whereClause.append(SQL`${item.oldValue}`);
      if (i < filterable.length - 1) {
        whereClause.append(`\nAND `);
      }
    }
    if (!whereClause.text) {
      findResults.push({
        error: `No columns found to filter table "${tableName}" among ${JSON.stringify(
          all.map((x) => {
            const { columnName, isPrimaryKey } = x;
            return {
              columnName,
              isPrimaryKey,
            };
          }),
          null,
          2,
        )} columns.`,
        schema,
        table,
        whereClause,
      });
      continue;
    }
    findQuery.append(whereClause);

    let count;

    // Show spinner while querying
    showToast({
      style: Toast.Style.Animated,
      title: "Finding Rows...",
    });
    if (databaseType === "postgres") {
      const result = await postgresPool.query(findQuery);
      count = result.rowCount;
    } else {
      const [result] = await mysqlPool.query<RowDataPacket[]>(findQuery.sql, findQuery.values);
      count = result.length;
    }
    showToast({
      style: Toast.Style.Success,
      title: `Found ${count} Row${count !== 1 ? "s" : ""}`,
    });

    if (count !== null && count > 1) {
      findResults.push({
        error: `Multiple rows match the update criteria for table "${tableName}".\n${whereClause.text}`,
        schema,
        table,
        whereClause,
      });
    } else if (count === 0) {
      findResults.push({
        error: `No rows match the  criteria for table "${tableName}". Cannot proceed with update.`,
        schema,
        table,
        whereClause,
      });
    } else {
      findResults.push({
        schema,
        table,
        whereClause,
      });
    }
  }

  return findResults;
}

export async function prepareTableRowUpdate(params: TableRowUpdateParams) {
  const findResults = await findRowsForUpdate(params);
  const finalUpdateQueries = [] as SQLStatement[];

  for (const result of findResults) {
    const { schema, table, whereClause } = result;

    const updates = params.allValues.filter(
      (item) => item.tableName === table && params.updateColumns.includes(item.columnName),
    );
    if (!updates.length) {
      continue;
    }
    if (result.error !== undefined) {
      throw new Error(result.error);
    }

    // Construct the UPDATE query
    const updateQuery = SQL``;
    if (databaseType === "postgres") {
      updateQuery.append(`UPDATE "${schema}"."${table}"\n`);
    } else {
      updateQuery.append(`UPDATE \`${schema}\`.\`${table}\`\n`);
    }
    updateQuery.append(`SET\n`);
    for (let i = 0; i < updates.length; i++) {
      const item = updates[i];
      if (databaseType === "postgres") {
        updateQuery.append(`"${item.originalColumnName}" = `);
      } else {
        updateQuery.append(`\`${item.originalColumnName}\` = `);
      }
      updateQuery.append(SQL`${item.value}`);
      if (i < updates.length - 1) {
        updateQuery.append(`,\n`);
      }
    }
    updateQuery.append(`\nWHERE `);

    updateQuery.append(whereClause);
    updateQuery.append(`;`);

    finalUpdateQueries.push(updateQuery);
  }

  return { queryText: finalUpdateQueries.map((x) => x.text).join("\n\n"), updateQueries: finalUpdateQueries };
}

export async function executeQueries({ queries }: { queries: SQLStatement[] }) {
  function success() {
    showToast({ title: `Executed ${queries.length} queries`, style: Toast.Style.Success });
  }
  if (databaseType === "postgres") {
    const client = await postgresPool.connect();
    try {
      await client.query("BEGIN");
      // SERIALIZABLE is required because all the generated queries assume values don't change during execution
      await client.query("SET TRANSACTION READ WRITE;");
      await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;");

      for (const query of queries) {
        await client.query(query);
      }

      await client.query("COMMIT");
      success();
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error updating row(s):", error);
      throw error;
    } finally {
      client.release();
    }
  } else {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;");

      for (const query of queries) {
        await connection.query(query.sql, query.values);
      }

      await connection.commit();
      success();
    } catch (error) {
      await connection.rollback();
      console.error("Error updating row(s):", error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

export async function prepareTableRowInsert({ allValues }: { allValues: TableRowUpdateParams["allValues"] }) {
  const tableGroups = new Map<string, (typeof allValues)[number][]>();
  for (const field of allValues) {
    if (!field.schemaName || !field.tableName) {
      continue;
    }
    const key = `${field.schemaName}.${field.tableName}`;
    if (!tableGroups.has(key)) {
      tableGroups.set(key, []);
    }
    if (field.value === null) {
      continue;
    }
    tableGroups.get(key)!.push(field);
  }

  const finalInsertQueries = [] as SQLStatement[];

  for (const [tableName, fields] of tableGroups) {
    const [schema, table] = tableName.split(".");
    if (!schema || !table) {
      throw new Error(`Invalid table name format for "${tableName}". Expected "schema.table"`);
    }

    // Construct the INSERT query
    const insertQuery = SQL``;
    if (databaseType === "postgres") {
      insertQuery.append(`INSERT INTO "${schema}"."${table}" (`);
    } else {
      insertQuery.append(`INSERT INTO \`${schema}\`.\`${table}\` (`);
    }

    const columns = fields.map((field) => {
      return databaseType === "postgres" ? `"${field.originalColumnName}"` : `\`${field.originalColumnName}\``;
    });
    insertQuery.append(columns.join(", "));
    insertQuery.append(`) VALUES (`);

    for (const field of fields) {
      insertQuery.append(SQL`${field.value}`);
      if (field !== fields[fields.length - 1]) {
        insertQuery.append(", ");
      }
    }
    insertQuery.append(`);`);

    finalInsertQueries.push(insertQuery);
  }

  return { queryText: finalInsertQueries.map((x) => x.text).join("\n\n"), insertQueries: finalInsertQueries };
}

export function fixDatabaseUri(connectionString: string) {
  try {
    // if connection is using Planetscale you need to add ?ssl={"rejectUnauthorized":true} at the end
    const url = new URL(connectionString);
    if (url.hostname.includes("psdb.cloud")) {
      url.searchParams.set("ssl", '{"rejectUnauthorized":true}');
    }
    return url.toString();
  } catch {
    return connectionString;
  }
}
export async function countRows({ table, query }: { table?: string; query?: string }): Promise<number> {
  let countQuery: string;

  if (query) {
    query = query.trim().replace(/;$/, "");
    countQuery = `SELECT COUNT(*) as count FROM (${query}) as subquery`;
  } else if (table) {
    const [schema, tableName] = table.split(".");
    if (databaseType === "postgres") {
      countQuery = `SELECT COUNT(*) as count FROM "${schema}"."${tableName}"`;
    } else {
      countQuery = `SELECT COUNT(*) as count FROM \`${schema}\`.\`${tableName}\``;
    }
  } else {
    throw new Error("Either table or query must be provided");
  }

  try {
    if (databaseType === "postgres") {
      const result = await postgresPool.query(countQuery);
      return parseInt(result.rows[0].count, 10);
    } else {
      const [rows] = await mysqlPool.query<RowDataPacket[]>(countQuery);
      return parseInt(rows[0].count.toString(), 10);
    }
  } catch (error) {
    console.error("Error counting rows:", error);
    throw error;
  }
}

export function quote(columnName: string) {
  if (databaseType === "postgres") {
    return `"${columnName}"`;
  } else if (databaseType === "mysql") {
    return `\`${columnName}\``;
  }
  return columnName;
}

export function exportToCsv({ rows, includeHeader = true }: { rows: Json[]; includeHeader?: boolean }): string {
  return Papa.unparse(rows, {
    // quotes: true,
    header: includeHeader,
    quoteChar: '"',
    delimiter: ",",
    skipEmptyLines: true,
  });
}

export function renderColumnValueForCsv(col: ColumnInfo, value: Json) {
  if (value == null) {
    return value;
  }
  let text = String(value);
  // console.log(JSON.stringify(col, null, 2));
  if (databaseType === "postgres") {
    if (col.typeId === pgTypes.builtins.BYTEA) {
      text = "";
    } else if (col.typeId === pgTypes.builtins.JSON || col.typeId === pgTypes.builtins.JSONB) {
      text = JSON.stringify(value);
    } else if (col.typeId === pgTypes.builtins.XML) {
      // TODO: XML
      text = "";
    } else if (col.typeId === pgTypes.builtins.TSVECTOR) {
      text = JSON.stringify(value);
    } else if (col.typeId === pgTypes.builtins.INTERVAL) {
      text = String(value);
    } else {
      text = String(value);
    }
  } else {
    if (
      col.typeId === mysql.Types.BLOB ||
      col.typeId === mysql.Types.TINY_BLOB ||
      col.typeId === mysql.Types.MEDIUM_BLOB ||
      col.typeId === mysql.Types.LONG_BLOB
    ) {
      if (typeof value === "string") {
        text = value;
      } else {
        text = "";
      }
    } else if (col.typeId === mysql.Types.JSON) {
      text = JSON.stringify(value);
    } else {
      text = String(value);
    }
  }
  if (text?.startsWith("[object Object]")) {
    text = JSON.stringify(text, null, 2);
  }
  return text;
}
