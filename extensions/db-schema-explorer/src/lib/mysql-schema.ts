// MySQL support is not currently integrated into the extension.
// This file exists for future MySQL support but is not actively used.
// The Connection type is defined locally to avoid requiring mysql2 dependency.

interface MysqlConnection {
  query(sql: string): Promise<[unknown, unknown[]]>;
}

export type MysqlTableRow = {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  TABLE_TYPE: string;
};

export type MysqlColumnRow = {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  COLUMN_NAME: string;
  ORDINAL_POSITION: number;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
  CHARACTER_MAXIMUM_LENGTH: number | null;
  NUMERIC_PRECISION: number | null;
  NUMERIC_SCALE: number | null;
};

export type MysqlPrimaryKeyRow = {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  CONSTRAINT_NAME: string;
  COLUMN_NAME: string;
  ORDINAL_POSITION: number;
};

export type MysqlUniqueRow = {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  CONSTRAINT_NAME: string;
  COLUMN_NAME: string;
  ORDINAL_POSITION: number;
};

export type MysqlForeignKeyRow = {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  COLUMN_NAME: string;
  ORDINAL_POSITION: number;
  CONSTRAINT_NAME: string;
  REFERENCED_TABLE_SCHEMA: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
};

export type MysqlIndexRow = {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  INDEX_NAME: string;
  COLUMN_NAME: string;
  SEQ_IN_INDEX: number;
  NON_UNIQUE: number;
};

export type MysqlSchemaData = {
  tables: MysqlTableRow[];
  columns: MysqlColumnRow[];
  primaryKeys: MysqlPrimaryKeyRow[];
  uniques: MysqlUniqueRow[];
  foreignKeys: MysqlForeignKeyRow[];
  indexes: MysqlIndexRow[];
};

const TABLES_QUERY = `
  SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
    AND TABLE_TYPE IN ('BASE TABLE', 'VIEW')
  ORDER BY TABLE_SCHEMA, TABLE_NAME
`;

const COLUMNS_QUERY = `
  SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION,
         DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
         CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
  ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
`;

const PRIMARY_KEYS_QUERY = `
  SELECT kcu.TABLE_SCHEMA, kcu.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.COLUMN_NAME, kcu.ORDINAL_POSITION
  FROM information_schema.TABLE_CONSTRAINTS tc
  JOIN information_schema.KEY_COLUMN_USAGE kcu
    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME = kcu.TABLE_NAME
  WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
    AND tc.TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
  ORDER BY kcu.TABLE_SCHEMA, kcu.TABLE_NAME, kcu.ORDINAL_POSITION
`;

const UNIQUES_QUERY = `
  SELECT kcu.TABLE_SCHEMA, kcu.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.COLUMN_NAME, kcu.ORDINAL_POSITION
  FROM information_schema.TABLE_CONSTRAINTS tc
  JOIN information_schema.KEY_COLUMN_USAGE kcu
    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME = kcu.TABLE_NAME
  WHERE tc.CONSTRAINT_TYPE = 'UNIQUE'
    AND tc.TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
  ORDER BY kcu.TABLE_SCHEMA, kcu.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION
`;

const FOREIGN_KEYS_QUERY = `
  SELECT kcu.TABLE_SCHEMA, kcu.TABLE_NAME, kcu.COLUMN_NAME, kcu.ORDINAL_POSITION,
         kcu.CONSTRAINT_NAME,
         kcu.REFERENCED_TABLE_SCHEMA, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  JOIN information_schema.TABLE_CONSTRAINTS tc
    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
   AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
   AND tc.TABLE_NAME = kcu.TABLE_NAME
  WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    AND kcu.TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
  ORDER BY kcu.TABLE_SCHEMA, kcu.TABLE_NAME, kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION
`;

const INDEXES_QUERY = `
  SELECT TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX, NON_UNIQUE
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
  ORDER BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
`;

export async function fetchMysqlSchemaData(conn: MysqlConnection): Promise<MysqlSchemaData> {
  const [tablesRes, columnsRes, pkRes, uniquesRes, fkRes, indexesRes] = await Promise.all([
    conn.query(TABLES_QUERY),
    conn.query(COLUMNS_QUERY),
    conn.query(PRIMARY_KEYS_QUERY),
    conn.query(UNIQUES_QUERY),
    conn.query(FOREIGN_KEYS_QUERY),
    conn.query(INDEXES_QUERY),
  ]);

  const rows = (result: unknown): unknown[] =>
    Array.isArray(result) && result.length === 2 && Array.isArray((result as [unknown, unknown])[1])
      ? ((result as [unknown, unknown[]])[1] as unknown[])
      : [];

  return {
    tables: rows(tablesRes) as MysqlTableRow[],
    columns: rows(columnsRes) as MysqlColumnRow[],
    primaryKeys: rows(pkRes) as MysqlPrimaryKeyRow[],
    uniques: rows(uniquesRes) as MysqlUniqueRow[],
    foreignKeys: rows(fkRes) as MysqlForeignKeyRow[],
    indexes: rows(indexesRes) as MysqlIndexRow[],
  };
}
