import type {
  MysqlSchemaData,
  MysqlTableRow,
  MysqlColumnRow,
  MysqlPrimaryKeyRow,
  MysqlUniqueRow,
  MysqlForeignKeyRow,
  MysqlIndexRow,
} from "./mysql-schema";

function quoteId(name: string): string {
  return "`" + name.replace(/`/g, "``") + "`";
}

function formatDefault(defaultVal: string | null): string {
  if (defaultVal == null || defaultVal.trim() === "") return "";
  const v = defaultVal.trim();
  if (v.toUpperCase() === "CURRENT_TIMESTAMP" || v.toUpperCase().startsWith("CURRENT_TIMESTAMP(")) {
    return " DEFAULT " + v;
  }
  if (v.toUpperCase() === "NULL") return "";
  return " DEFAULT " + v;
}

function buildTableDdl(
  table: MysqlTableRow,
  columns: MysqlColumnRow[],
  primaryKeys: MysqlPrimaryKeyRow[],
  uniques: MysqlUniqueRow[],
  foreignKeys: MysqlForeignKeyRow[],
  indexes: MysqlIndexRow[],
): string {
  const tableCols = columns.filter((c) => c.TABLE_SCHEMA === table.TABLE_SCHEMA && c.TABLE_NAME === table.TABLE_NAME);
  const pkCols = primaryKeys
    .filter((p) => p.TABLE_SCHEMA === table.TABLE_SCHEMA && p.TABLE_NAME === table.TABLE_NAME)
    .sort((a, b) => a.ORDINAL_POSITION - b.ORDINAL_POSITION)
    .map((p) => p.COLUMN_NAME);
  const uniqueGroups = new Map<string, { COLUMN_NAME: string; ORDINAL_POSITION: number }[]>();
  for (const u of uniques.filter((u) => u.TABLE_SCHEMA === table.TABLE_SCHEMA && u.TABLE_NAME === table.TABLE_NAME)) {
    const list = uniqueGroups.get(u.CONSTRAINT_NAME) ?? [];
    list.push({ COLUMN_NAME: u.COLUMN_NAME, ORDINAL_POSITION: u.ORDINAL_POSITION });
    uniqueGroups.set(u.CONSTRAINT_NAME, list);
  }
  for (const arr of uniqueGroups.values()) {
    arr.sort((a, b) => a.ORDINAL_POSITION - b.ORDINAL_POSITION);
  }
  const fkByConstraint = new Map<string, MysqlForeignKeyRow[]>();
  for (const fk of foreignKeys.filter(
    (f) => f.TABLE_SCHEMA === table.TABLE_SCHEMA && f.TABLE_NAME === table.TABLE_NAME,
  )) {
    const list = fkByConstraint.get(fk.CONSTRAINT_NAME) ?? [];
    list.push(fk);
    fkByConstraint.set(fk.CONSTRAINT_NAME, list);
  }
  for (const list of fkByConstraint.values()) {
    list.sort((a, b) => a.ORDINAL_POSITION - b.ORDINAL_POSITION);
  }

  const pkConstraintNames = new Set(
    primaryKeys
      .filter((p) => p.TABLE_SCHEMA === table.TABLE_SCHEMA && p.TABLE_NAME === table.TABLE_NAME)
      .map((p) => p.CONSTRAINT_NAME),
  );
  const uniqueConstraintNames = new Set(
    uniques
      .filter((u) => u.TABLE_SCHEMA === table.TABLE_SCHEMA && u.TABLE_NAME === table.TABLE_NAME)
      .map((u) => u.CONSTRAINT_NAME),
  );
  const tableIndexes = indexes.filter(
    (i) => i.TABLE_SCHEMA === table.TABLE_SCHEMA && i.TABLE_NAME === table.TABLE_NAME,
  );
  const indexByName = new Map<string, MysqlIndexRow[]>();
  for (const i of tableIndexes) {
    if (i.INDEX_NAME === "PRIMARY") continue;
    const list = indexByName.get(i.INDEX_NAME) ?? [];
    list.push(i);
    indexByName.set(i.INDEX_NAME, list);
  }
  for (const list of indexByName.values()) {
    list.sort((a, b) => a.SEQ_IN_INDEX - b.SEQ_IN_INDEX);
  }

  const colLines: string[] = [];
  const fkByColumn = new Map<string, MysqlForeignKeyRow>();
  for (const fk of foreignKeys.filter(
    (f) => f.TABLE_SCHEMA === table.TABLE_SCHEMA && f.TABLE_NAME === table.TABLE_NAME,
  )) {
    fkByColumn.set(fk.COLUMN_NAME, fk);
  }
  for (const col of tableCols) {
    const typeStr = col.COLUMN_TYPE;
    const nullStr = col.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL";
    const defaultStr = formatDefault(col.COLUMN_DEFAULT);
    const fk = fkByColumn.get(col.COLUMN_NAME);
    const fkComment = fk
      ? ` -- FK: ${fk.REFERENCED_TABLE_SCHEMA}.${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`
      : "";
    colLines.push(`  ${quoteId(col.COLUMN_NAME)} ${typeStr} ${nullStr}${defaultStr}${fkComment}`);
  }

  if (pkCols.length > 0) {
    colLines.push(`  PRIMARY KEY (${pkCols.map(quoteId).join(", ")})`);
  }
  for (const [constraintName, cols] of uniqueGroups) {
    colLines.push(`  UNIQUE KEY ${quoteId(constraintName)} (${cols.map((c) => quoteId(c.COLUMN_NAME)).join(", ")})`);
  }
  for (const [constraintName, fkList] of fkByConstraint) {
    const cols = fkList.map((f) => quoteId(f.COLUMN_NAME)).join(", ");
    const first = fkList[0]!;
    const ref = `${quoteId(first.REFERENCED_TABLE_SCHEMA)}.${quoteId(first.REFERENCED_TABLE_NAME)} (${fkList.map((f) => quoteId(f.REFERENCED_COLUMN_NAME)).join(", ")})`;
    colLines.push(`  CONSTRAINT ${quoteId(constraintName)} FOREIGN KEY (${cols}) REFERENCES ${ref}`);
  }
  for (const [indexName, indexCols] of indexByName) {
    if (pkConstraintNames.has(indexName) || uniqueConstraintNames.has(indexName)) continue;
    if (indexName === "PRIMARY") continue;
    const unique = indexCols[0]?.NON_UNIQUE === 0;
    colLines.push(
      `  ${unique ? "UNIQUE " : ""}KEY ${quoteId(indexName)} (${indexCols.map((c) => quoteId(c.COLUMN_NAME)).join(", ")})`,
    );
  }

  const qualifiedName = `${quoteId(table.TABLE_SCHEMA)}.${quoteId(table.TABLE_NAME)}`;
  if (table.TABLE_TYPE === "VIEW") {
    return `-- View: ${qualifiedName} (definition in DB)\nCREATE VIEW ${qualifiedName} AS\n  SELECT ${tableCols.map((c) => quoteId(c.COLUMN_NAME)).join(", ")} FROM ...;`;
  }
  return `CREATE TABLE ${qualifiedName} (\n${colLines.join(",\n")}\n);`;
}

export function buildMysqlSchemaDdl(data: MysqlSchemaData): {
  tableDdls: Map<string, string>;
  tableTypes: Map<string, "table" | "view">;
} {
  const tableDdls = new Map<string, string>();
  const tableTypes = new Map<string, "table" | "view">();

  for (const table of data.tables) {
    const key = `${table.TABLE_SCHEMA}.${table.TABLE_NAME}`;
    tableTypes.set(key, table.TABLE_TYPE === "VIEW" ? "view" : "table");
    const ddl = buildTableDdl(table, data.columns, data.primaryKeys, data.uniques, data.foreignKeys, data.indexes);
    tableDdls.set(key, ddl);
  }

  return { tableDdls, tableTypes };
}
