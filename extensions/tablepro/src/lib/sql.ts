const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /--[^\n]*/g;

const READ_ONLY_PRAGMAS = new Set([
  "database_list",
  "table_list",
  "table_info",
  "table_xinfo",
  "index_list",
  "index_info",
  "index_xinfo",
  "foreign_key_list",
  "function_list",
  "module_list",
  "pragma_list",
  "collation_list",
  "compile_options",
  "data_version",
  "freelist_count",
  "page_count",
  "page_size",
  "schema_version",
  "user_version",
  "application_id",
  "encoding",
  "journal_mode",
  "locking_mode",
  "synchronous",
  "wal_checkpoint",
  "integrity_check",
  "quick_check",
  "foreign_key_check",
  "cache_size",
  "auto_vacuum",
  "busy_timeout",
  "cache_spill",
  "cell_size_check",
  "checkpoint_fullfsync",
  "defer_foreign_keys",
  "fullfsync",
  "ignore_check_constraints",
  "legacy_alter_table",
  "max_page_count",
  "mmap_size",
  "query_only",
  "read_uncommitted",
  "recursive_triggers",
  "reverse_unordered_selects",
  "secure_delete",
  "soft_heap_limit",
  "temp_store",
  "threads",
  "trusted_schema",
  "writable_schema",
]);

export function stripSQLComments(sql: string): string {
  return sql.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "");
}

function stripLeadingCTE(sql: string): string {
  if (!/^\s*WITH\b/i.test(sql)) return sql;
  let i = sql.search(/\S/);
  i += "WITH".length;
  if (/^\s+RECURSIVE\b/i.test(sql.slice(i))) {
    i = sql.toUpperCase().indexOf("RECURSIVE", i) + "RECURSIVE".length;
  }
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  while (i < sql.length) {
    const c = sql[i];
    if (inSingle) {
      if (c === "'") inSingle = false;
    } else if (inDouble) {
      if (c === '"') inDouble = false;
    } else if (inBacktick) {
      if (c === "`") inBacktick = false;
    } else if (c === "'") {
      inSingle = true;
    } else if (c === '"') {
      inDouble = true;
    } else if (c === "`") {
      inBacktick = true;
    } else if (c === "(") {
      depth += 1;
    } else if (c === ")") {
      depth -= 1;
      if (depth === 0) {
        const rest = sql.slice(i + 1);
        if (/^\s*,/.test(rest)) {
          i = i + 1 + rest.indexOf(",") + 1;
          continue;
        }
        return rest.replace(/^\s+/, "");
      }
    }
    i += 1;
  }
  return sql;
}

export function splitSQLStatements(sql: string): string[] {
  const stripped = stripSQLComments(sql);
  const statements: string[] = [];
  let buffer = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inBracket = false;
  let dollarTag: string | null = null;
  let i = 0;
  while (i < stripped.length) {
    const c = stripped[i]!;
    if (dollarTag !== null) {
      if (stripped.startsWith(dollarTag, i)) {
        buffer += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      buffer += c;
      i += 1;
      continue;
    }
    if (inSingle) {
      buffer += c;
      if (c === "'") {
        if (stripped[i + 1] === "'") {
          buffer += "'";
          i += 2;
          continue;
        }
        inSingle = false;
      }
      i += 1;
      continue;
    }
    if (inDouble) {
      buffer += c;
      if (c === '"') inDouble = false;
      i += 1;
      continue;
    }
    if (inBacktick) {
      buffer += c;
      if (c === "`") inBacktick = false;
      i += 1;
      continue;
    }
    if (inBracket) {
      buffer += c;
      if (c === "]") inBracket = false;
      i += 1;
      continue;
    }
    if (c === "$") {
      const tagMatch = stripped
        .slice(i)
        .match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (tagMatch) {
        dollarTag = tagMatch[0];
        buffer += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }
    if (c === "'") {
      inSingle = true;
      buffer += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inDouble = true;
      buffer += c;
      i += 1;
      continue;
    }
    if (c === "`") {
      inBacktick = true;
      buffer += c;
      i += 1;
      continue;
    }
    if (c === "[") {
      inBracket = true;
      buffer += c;
      i += 1;
      continue;
    }
    if (c === ";") {
      const trimmed = buffer.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      buffer = "";
      i += 1;
      continue;
    }
    buffer += c;
    i += 1;
  }
  const tail = buffer.trim();
  if (tail.length > 0) statements.push(tail);
  return statements;
}

export function isReadOnlySQL(sql: string): boolean {
  if (!sql) return false;
  const statements = splitSQLStatements(sql);
  if (statements.length === 0) return false;
  return statements.every(isReadOnlyStatement);
}

function isReadOnlyStatement(statement: string): boolean {
  const body = stripLeadingCTE(statement.trim());
  const head = body.match(/^\s*([A-Za-z_]+)/);
  if (!head) return false;
  const [, captured] = head;
  if (!captured) return false;
  const keyword = captured.toUpperCase();
  switch (keyword) {
    case "SELECT":
    case "SHOW":
    case "DESCRIBE":
    case "DESC":
    case "USE":
    case "BEGIN":
    case "START":
    case "COMMIT":
    case "END":
    case "ROLLBACK":
    case "SAVEPOINT":
    case "RELEASE":
      return true;
    case "EXPLAIN": {
      const after = body.slice(head[0].length).trim();
      if (/^ANALYZE\b/i.test(after)) return false;
      // Also catch: EXPLAIN (ANALYZE ...) ...
      if (/^\(\s*ANALYZE\b/i.test(after)) return false;
      return true;
    }
    case "PRAGMA": {
      const after = body.slice(head[0].length).trim();
      const name = after.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
      if (!name) return false;
      const [matched, captured] = name;
      if (!captured) return false;
      const pragma = captured.toLowerCase();
      const rest = after.slice(matched.length).trim();
      if (rest.startsWith("=")) return false;
      if (rest.startsWith("(")) return READ_ONLY_PRAGMAS.has(pragma);
      return READ_ONLY_PRAGMAS.has(pragma);
    }
    default:
      return false;
  }
}

export function isMutatingSQL(sql: string): boolean {
  if (!sql) return false;
  const statements = splitSQLStatements(sql);
  if (statements.length === 0) return false;
  return !statements.every(isReadOnlyStatement);
}

export function summarizeSQL(sql: string, max = 240): string {
  const cleaned = sql.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1) + "…";
}
