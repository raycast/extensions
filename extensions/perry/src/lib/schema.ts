import { Pool } from "pg";

interface TableInfo {
  schema: string;
  name: string;
}

export interface ColumnWithTable {
  tableName: string;
  tableSchema: string;
  columnName: string;
  dataType: string;
}

export async function loadFullSchema(connectionString: string): Promise<{
  tables: TableInfo[];
  allColumns: ColumnWithTable[];
}> {
  const pool = new Pool({ connectionString, max: 1 });

  try {
    const [tablesResult, columnsResult] = await Promise.all([
      pool.query(`
        SELECT table_schema as schema, table_name as name
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name
      `),
      pool.query(`
        SELECT
          c.table_schema as table_schema,
          c.table_name as table_name,
          c.column_name as column_name,
          c.data_type as data_type
        FROM information_schema.columns c
        INNER JOIN information_schema.tables t
          ON c.table_schema = t.table_schema AND c.table_name = t.table_name
        WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY c.table_schema, c.table_name, c.ordinal_position
      `),
    ]);

    return {
      tables: tablesResult.rows.map((row) => ({ schema: row.schema, name: row.name })),
      allColumns: columnsResult.rows.map((row) => ({
        tableSchema: row.table_schema,
        tableName: row.table_name,
        columnName: row.column_name,
        dataType: row.data_type,
      })),
    };
  } finally {
    await pool.end();
  }
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
}

export interface ForeignKey {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface Index {
  name: string;
  definition: string;
  isUnique: boolean;
  isPrimary: boolean;
}

export interface TableSchemaInfo {
  columns: TableColumn[];
  foreignKeys: ForeignKey[];
  indexes: Index[];
}

export async function getTableSchema(
  connectionString: string,
  tableName: string,
  schema: string = "public",
): Promise<TableSchemaInfo> {
  const pool = new Pool({ connectionString, max: 1 });

  try {
    const [columnsResult, primaryKeysResult, foreignKeysResult, indexesResult] = await Promise.all([
      pool.query(
        `
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `,
        [schema, tableName],
      ),
      pool.query(
        `
        SELECT a.attname as column_name
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = ($1 || '.' || $2)::regclass AND i.indisprimary
      `,
        [schema, tableName],
      ),
      pool.query(
        `
        SELECT
          kcu.column_name,
          ccu.table_name AS referenced_table,
          ccu.column_name AS referenced_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = $1
          AND tc.table_name = $2
      `,
        [schema, tableName],
      ),
      pool.query(
        `
        SELECT
          i.indexname as name,
          i.indexdef as definition,
          idx.indisunique as is_unique,
          idx.indisprimary as is_primary
        FROM pg_indexes i
        JOIN pg_class c ON c.relname = i.indexname
        JOIN pg_index idx ON idx.indexrelid = c.oid
        WHERE i.schemaname = $1 AND i.tablename = $2
        ORDER BY i.indexname
      `,
        [schema, tableName],
      ),
    ]);

    const primaryKeyColumns = new Set(primaryKeysResult.rows.map((row) => row.column_name));

    const columns: TableColumn[] = columnsResult.rows.map((row) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === "YES",
      defaultValue: row.column_default,
      isPrimaryKey: primaryKeyColumns.has(row.column_name),
    }));

    const foreignKeys: ForeignKey[] = foreignKeysResult.rows.map((row) => ({
      columnName: row.column_name,
      referencedTable: row.referenced_table,
      referencedColumn: row.referenced_column,
    }));

    const indexes: Index[] = indexesResult.rows.map((row) => ({
      name: row.name,
      definition: row.definition,
      isUnique: row.is_unique,
      isPrimary: row.is_primary,
    }));

    return { columns, foreignKeys, indexes };
  } finally {
    await pool.end();
  }
}
