import type {
  SchemaData,
  ColumnRow,
  TableRow,
  EnumTypeRow,
  PrimaryKeyRow,
  UniqueRow,
  ForeignKeyRow,
  IndexRow,
} from "./pg-schema";

function quoteId(name: string): string {
  if (/^[a-z_][a-z0-9_]*$/.test(name)) return name;
  return `"${name.replace(/"/g, '""')}"`;
}

function formatType(col: ColumnRow, enumTypeByUdt: Map<string, { schema: string; typname: string }>): string {
  const udtKey = `${col.udt_schema}.${col.udt_name}`;
  const customEnum = enumTypeByUdt.get(udtKey);
  if (customEnum) {
    return `${quoteId(customEnum.schema)}.${quoteId(customEnum.typname)}`;
  }
  switch (col.data_type) {
    case "character varying":
    case "varchar":
      return col.character_maximum_length != null
        ? `character varying(${col.character_maximum_length})`
        : "character varying";
    case "character":
    case "char":
      return col.character_maximum_length != null ? `character(${col.character_maximum_length})` : "character(1)";
    case "numeric":
    case "decimal": {
      if (col.numeric_precision == null) return "numeric";
      if (col.numeric_scale == null || col.numeric_scale === 0) return `numeric(${col.numeric_precision})`;
      return `numeric(${col.numeric_precision},${col.numeric_scale})`;
    }
    case "timestamp with time zone":
      return "timestamp with time zone";
    case "timestamp without time zone":
      return "timestamp without time zone";
    case "time with time zone":
      return "time with time zone";
    case "time without time zone":
      return "time without time zone";
    default:
      return col.data_type;
  }
}

function buildEnumsDdlForTypes(enumTypeRows: EnumTypeRow[], typeKeys: Set<string>): string {
  const byType = new Map<string, { schema: string; labels: string[] }>();
  for (const row of enumTypeRows) {
    const key = `${row.nspname}.${row.typname}`;
    if (!typeKeys.has(key)) continue;
    if (!byType.has(key)) {
      byType.set(key, { schema: row.nspname, labels: [] });
    }
    const entry = byType.get(key)!;
    entry.labels.push(row.enumlabel);
  }
  const lines: string[] = [];
  for (const [key, { schema, labels }] of byType) {
    const typname = key.split(".")[1];
    const values = labels.map((l) => `'${l.replace(/'/g, "''")}'`).join(", ");
    lines.push(`CREATE TYPE ${quoteId(schema)}.${quoteId(typname)} AS ENUM (${values});`);
  }
  return lines.join("\n");
}

function buildTableDdl(
  table: TableRow,
  columns: ColumnRow[],
  primaryKeys: PrimaryKeyRow[],
  uniques: UniqueRow[],
  foreignKeys: ForeignKeyRow[],
  indexes: IndexRow[],
  enumTypeByUdt: Map<string, { schema: string; typname: string }>,
): { tableDdl: string; usedEnumKeys: Set<string> } {
  const tableCols = columns.filter((c) => c.table_schema === table.table_schema && c.table_name === table.table_name);
  const pkCols = primaryKeys
    .filter((p) => p.table_schema === table.table_schema && p.table_name === table.table_name)
    .sort((a, b) => a.ordinal_position - b.ordinal_position)
    .map((p) => p.column_name);
  const uniqueGroups = new Map<string, { column_name: string; ordinal_position: number }[]>();
  for (const u of uniques.filter((u) => u.table_schema === table.table_schema && u.table_name === table.table_name)) {
    const list = uniqueGroups.get(u.constraint_name) ?? [];
    list.push({ column_name: u.column_name, ordinal_position: u.ordinal_position });
    uniqueGroups.set(u.constraint_name, list);
  }
  for (const arr of uniqueGroups.values()) {
    arr.sort((a, b) => a.ordinal_position - b.ordinal_position);
  }
  const fkByColumn = new Map<string, ForeignKeyRow>();
  const fkByConstraint = new Map<string, ForeignKeyRow[]>();
  for (const fk of foreignKeys.filter(
    (f) => f.table_schema === table.table_schema && f.table_name === table.table_name,
  )) {
    fkByColumn.set(fk.column_name, fk);
    const list = fkByConstraint.get(fk.constraint_name) ?? [];
    list.push(fk);
    fkByConstraint.set(fk.constraint_name, list);
  }
  for (const list of fkByConstraint.values()) {
    list.sort((a, b) => a.ordinal_position - b.ordinal_position);
  }

  const usedEnumKeys = new Set<string>();
  const colLines: string[] = [];
  for (const col of tableCols) {
    const udtKey = `${col.udt_schema}.${col.udt_name}`;
    if (enumTypeByUdt.has(udtKey)) usedEnumKeys.add(udtKey);
    const typeStr = formatType(col, enumTypeByUdt);
    const nullStr = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
    const defaultStr =
      col.column_default != null && col.column_default.trim() !== "" ? ` DEFAULT ${col.column_default}` : "";
    const fk = fkByColumn.get(col.column_name);
    const fkComment = fk ? ` -- FK: ${fk.ref_table_schema}.${fk.ref_table_name}.${fk.ref_column_name}` : "";
    colLines.push(`  ${quoteId(col.column_name)} ${typeStr} ${nullStr}${defaultStr}${fkComment}`);
  }

  if (pkCols.length > 0) {
    colLines.push(`  PRIMARY KEY (${pkCols.map(quoteId).join(", ")})`);
  }
  for (const cols of uniqueGroups.values()) {
    colLines.push(`  UNIQUE (${cols.map((c) => quoteId(c.column_name)).join(", ")})`);
  }
  for (const fkList of fkByConstraint.values()) {
    const cols = fkList.map((f) => quoteId(f.column_name)).join(", ");
    const refCols = fkList.map((f) => quoteId(f.ref_column_name)).join(", ");
    const first = fkList[0];
    colLines.push(
      `  CONSTRAINT ${quoteId(first.constraint_name)} FOREIGN KEY (${cols}) REFERENCES ${quoteId(first.ref_table_schema)}.${quoteId(first.ref_table_name)} (${refCols})`,
    );
  }

  const qualifiedName = `${quoteId(table.table_schema)}.${quoteId(table.table_name)}`;
  let tableDdl: string;
  if (table.table_type === "VIEW") {
    tableDdl = `-- View: ${qualifiedName} (definition in DB)\nCREATE VIEW ${qualifiedName} AS\n  SELECT ${tableCols.map((c) => quoteId(c.column_name)).join(", ")} FROM ...;`;
  } else {
    tableDdl = `CREATE TABLE ${qualifiedName} (\n${colLines.join(",\n")}\n);`;
  }

  const pkConstraintNames = new Set(
    primaryKeys
      .filter((p) => p.table_schema === table.table_schema && p.table_name === table.table_name)
      .map((p) => p.constraint_name),
  );
  const uniqueConstraintNames = new Set(
    uniques
      .filter((u) => u.table_schema === table.table_schema && u.table_name === table.table_name)
      .map((u) => u.constraint_name),
  );
  const tableIndexes = indexes.filter((i) => i.schemaname === table.table_schema && i.tablename === table.table_name);
  const extraIndexes = tableIndexes.filter((i) => {
    if (i.indexname.endsWith("_pkey")) return false;
    if (pkConstraintNames.has(i.indexname)) return false;
    if (uniqueConstraintNames.has(i.indexname)) return false;
    return true;
  });
  const indexDdls = extraIndexes.map((i) => i.indexdef + ";").join("\n");
  const fullDdl = indexDdls ? `${tableDdl}\n\n${indexDdls}` : tableDdl;

  return { tableDdl: fullDdl, usedEnumKeys };
}

export function buildSchemaDdl(data: SchemaData): {
  tableDdls: Map<string, string>;
  tableTypes: Map<string, "table" | "view">;
} {
  const enumTypeByUdt = new Map<string, { schema: string; typname: string }>();
  for (const row of data.enums) {
    enumTypeByUdt.set(`${row.nspname}.${row.typname}`, { schema: row.nspname, typname: row.typname });
  }

  const tableDdls = new Map<string, string>();
  const tableTypes = new Map<string, "table" | "view">();

  for (const table of data.tables) {
    const key = `${table.table_schema}.${table.table_name}`;
    tableTypes.set(key, table.table_type === "VIEW" ? "view" : "table");
    const { tableDdl, usedEnumKeys } = buildTableDdl(
      table,
      data.columns,
      data.primaryKeys,
      data.uniques,
      data.foreignKeys,
      data.indexes,
      enumTypeByUdt,
    );
    const enumsDdl = usedEnumKeys.size > 0 ? buildEnumsDdlForTypes(data.enums, usedEnumKeys) : "";
    const fullDdl = enumsDdl ? `${enumsDdl}\n\n${tableDdl}` : tableDdl;
    tableDdls.set(key, fullDdl);
  }

  return { tableDdls, tableTypes };
}
