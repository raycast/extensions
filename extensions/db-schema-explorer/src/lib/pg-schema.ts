import type { Client } from "pg";

export type ColumnRow = {
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
  data_type: string;
  udt_schema: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
};

export type TableRow = {
  table_schema: string;
  table_name: string;
  table_type: string;
};

export type EnumTypeRow = {
  nspname: string;
  typname: string;
  enumlabel: string;
  enumsortorder: number;
};

export type PrimaryKeyRow = {
  table_schema: string;
  table_name: string;
  constraint_name: string;
  column_name: string;
  ordinal_position: number;
};

export type UniqueRow = {
  table_schema: string;
  table_name: string;
  constraint_name: string;
  column_name: string;
  ordinal_position: number;
};

export type ForeignKeyRow = {
  table_schema: string;
  table_name: string;
  column_name: string;
  ordinal_position: number;
  constraint_name: string;
  ref_table_schema: string;
  ref_table_name: string;
  ref_column_name: string;
};

const TABLES_QUERY = `
  SELECT table_schema, table_name, table_type
  FROM information_schema.tables
  WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
    AND table_type IN ('BASE TABLE', 'VIEW')
  ORDER BY table_schema, table_name
`;

const COLUMNS_QUERY = `
  SELECT table_schema, table_name, column_name, ordinal_position,
         data_type, udt_schema, udt_name, is_nullable, column_default,
         character_maximum_length, numeric_precision, numeric_scale
  FROM information_schema.columns
  WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  ORDER BY table_schema, table_name, ordinal_position
`;

const ENUMS_QUERY = `
  SELECT n.nspname AS nspname, t.typname AS typname, e.enumlabel AS enumlabel, e.enumsortorder AS enumsortorder
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
  WHERE t.typtype = 'e'
    AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY n.nspname, t.typname, e.enumsortorder
`;

const PRIMARY_KEYS_QUERY = `
  SELECT tc.table_schema, tc.table_name, tc.constraint_name, kcu.column_name, kcu.ordinal_position
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
  ORDER BY tc.table_schema, tc.table_name, kcu.ordinal_position
`;

const UNIQUES_QUERY = `
  SELECT tc.table_schema, tc.table_name, tc.constraint_name, kcu.column_name, kcu.ordinal_position
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema NOT IN ('pg_catalog', 'information_schema')
  ORDER BY tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position
`;

const FOREIGN_KEYS_QUERY = `
  SELECT
    fk.table_schema AS table_schema,
    fk.table_name AS table_name,
    fk.column_name AS column_name,
    fk.ordinal_position AS ordinal_position,
    rc.constraint_name AS constraint_name,
    pk.table_schema AS ref_table_schema,
    pk.table_name AS ref_table_name,
    pk.column_name AS ref_column_name
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage fk
    ON rc.constraint_catalog = fk.constraint_catalog
   AND rc.constraint_schema = fk.constraint_schema
   AND rc.constraint_name = fk.constraint_name
  JOIN information_schema.constraint_column_usage pk
    ON rc.unique_constraint_catalog = pk.constraint_catalog
   AND rc.unique_constraint_schema = pk.constraint_schema
   AND rc.unique_constraint_name = pk.constraint_name
  WHERE fk.table_schema NOT IN ('pg_catalog', 'information_schema')
  ORDER BY fk.table_schema, fk.table_name, rc.constraint_name, fk.ordinal_position
`;

const INDEXES_QUERY = `
  SELECT schemaname, tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY schemaname, tablename
`;

export type IndexRow = {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
};

export type SchemaData = {
  tables: TableRow[];
  columns: ColumnRow[];
  enums: EnumTypeRow[];
  primaryKeys: PrimaryKeyRow[];
  uniques: UniqueRow[];
  foreignKeys: ForeignKeyRow[];
  indexes: IndexRow[];
};

export async function fetchSchemaData(client: Client): Promise<SchemaData> {
  const [tablesRes, columnsRes, enumsRes, pkRes, uniquesRes, fkRes, indexesRes] = await Promise.all([
    client.query(TABLES_QUERY),
    client.query(COLUMNS_QUERY),
    client.query(ENUMS_QUERY),
    client.query(PRIMARY_KEYS_QUERY),
    client.query(UNIQUES_QUERY),
    client.query(FOREIGN_KEYS_QUERY),
    client.query(INDEXES_QUERY),
  ]);

  return {
    tables: tablesRes.rows as TableRow[],
    columns: columnsRes.rows as ColumnRow[],
    enums: enumsRes.rows as EnumTypeRow[],
    primaryKeys: pkRes.rows as PrimaryKeyRow[],
    uniques: uniquesRes.rows as UniqueRow[],
    foreignKeys: fkRes.rows as ForeignKeyRow[],
    indexes: indexesRes.rows as IndexRow[],
  };
}
