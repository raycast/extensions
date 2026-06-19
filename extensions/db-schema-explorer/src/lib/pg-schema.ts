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
    src_ns.nspname AS table_schema,
    src_tbl.relname AS table_name,
    src_att.attname AS column_name,
    src_pos.ordinality AS ordinal_position,
    con.conname AS constraint_name,
    ref_ns.nspname AS ref_table_schema,
    ref_tbl.relname AS ref_table_name,
    ref_att.attname AS ref_column_name
  FROM pg_constraint con
  JOIN pg_class src_tbl ON src_tbl.oid = con.conrelid
  JOIN pg_namespace src_ns ON src_ns.oid = src_tbl.relnamespace
  JOIN pg_class ref_tbl ON ref_tbl.oid = con.confrelid
  JOIN pg_namespace ref_ns ON ref_ns.oid = ref_tbl.relnamespace
  JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS src_pos(attnum, ordinality) ON true
  JOIN LATERAL unnest(con.confkey) WITH ORDINALITY AS ref_pos(attnum, ordinality)
    ON ref_pos.ordinality = src_pos.ordinality
  JOIN pg_attribute src_att ON src_att.attrelid = src_tbl.oid AND src_att.attnum = src_pos.attnum
  JOIN pg_attribute ref_att ON ref_att.attrelid = ref_tbl.oid AND ref_att.attnum = ref_pos.attnum
  WHERE con.contype = 'f'
    AND src_ns.nspname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY src_ns.nspname, src_tbl.relname, con.conname, src_pos.ordinality
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
