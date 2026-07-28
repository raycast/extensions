import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

/**
 * MyBatis 日志格式化命令。
 *
 * MyBatis 打印的 SQL 类似：
 *
 *   ==>  Preparing: SELECT id, name FROM users WHERE status = ? AND created_at > ?
 *   ==> Parameters: 1(Integer), 2024-01-01 00:00:00.000(Timestamp)
 *   <==      Total: 5
 *
 * 这些 `?` 占位符难以直接复制到 SQL 客户端执行。本命令会解析日志、
 * 用绑定值替换占位符，并把可执行的语句连同一键复制操作一起呈现。
 *
 * 启动时读取剪贴板：若已包含可解析的日志片段，直接进入结果视图；
 * 否则回退到 Form 表单让用户手动粘贴。
 */
export default function Command() {
  const navigation = useNavigation();
  const [clipboard, setClipboard] = useState<{ value: string | null; status: "loading" | "ready" }>({
    value: null,
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const text = await Clipboard.readText();
        if (!cancelled) {
          setClipboard({ value: text ?? null, status: "ready" });
        }
      } catch (error) {
        if (!cancelled) {
          setClipboard({ value: null, status: "ready" });
          await showToast({
            style: Toast.Style.Failure,
            title: "无法读取剪贴板",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (clipboard.status !== "ready") {
      return;
    }
    const trimmed = (clipboard.value ?? "").trim();
    if (!trimmed) {
      return;
    }
    const parsed = parseMybatisLog(trimmed);
    if (parsed) {
      navigation.push(<MybatisResultView parsed={parsed} original={trimmed} />);
    }
  }, [clipboard, navigation]);

  if (clipboard.status === "loading") {
    return <Detail isLoading markdown="正在读取剪贴板…" />;
  }

  // Clipboard did not look like a MyBatis log – let the user paste it.
  const seed = (clipboard.value ?? "").trim() ? (clipboard.value ?? "") : "";
  return <MybatisInputForm initialValue={seed} />;
}

/** Form used when clipboard auto-detection fails. */
function MybatisInputForm({ initialValue }: { initialValue: string }) {
  const navigation = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="格式化 SQL"
            icon={Icon.Checkmark}
            onSubmit={(values) => {
              const text = (values.content ?? "").trim();
              if (!text) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "请先粘贴 MyBatis 日志片段",
                });
                return;
              }
              const parsed = parseMybatisLog(text);
              if (!parsed) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "未找到 Preparing: 行",
                  message: "请复制日志中以 `==> Preparing:` 开头的行。",
                });
                return;
              }
              navigation.push(<MybatisResultView parsed={parsed} original={text} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="MyBatis 日志"
        placeholder={"==>  Preparing: SELECT * FROM users WHERE id = ?\n" + "==> Parameters: 1(Integer)"}
        defaultValue={initialValue}
        enableMarkdown={false}
      />
      <Form.Description
        title="提示"
        text="复制 MyBatis 日志中 `==> Preparing:` 与 `==> Parameters:` 开头的行，按 ⏎ 提交。"
      />
    </Form>
  );
}

/** Result view: runnable SQL + copy action + parameter list. */
function MybatisResultView({ parsed, original }: { parsed: ParsedMybatisLog; original: string }) {
  const navigation = useNavigation();
  const metadata = useMemo(() => buildMetadata(parsed), [parsed]);

  return (
    <Detail
      markdown={`## SQL\n\n\`\`\`sql\n${parsed.sql}\n\`\`\``}
      metadata={metadata}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="复制格式化后的 SQL"
            icon={Icon.Clipboard}
            content={parsed.sql}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="复制为 INSERT 语句"
            icon={Icon.Plus}
            content={toInsertStatement(parsed.sql)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <Action.CopyToClipboard
            title="复制原始日志"
            icon={Icon.Text}
            content={original}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="编辑输入"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() => navigation.pop()}
          />
        </ActionPanel>
      }
    />
  );
}

/* ------------------------------------------------------------------------ */
/*  Parsing                                                                  */
/* ------------------------------------------------------------------------ */

export type ParsedParameter = {
  /** Raw textual representation as it appeared in the log. */
  raw: string;
  /** Value without the `(Type)` suffix, unescaped. */
  value: string;
  /** Type name as printed by MyBatis (e.g. `String`, `Integer`). */
  type: string;
};

export type ParsedMybatisLog = {
  /** SQL after substituting `?` placeholders with their bound values. */
  sql: string;
  /** Bound parameters in the order they appear in the SQL. */
  parameters: ParsedParameter[];
  /** Raw SQL template (with `?` placeholders still in place). */
  template: string;
};

/**
 * Try to extract a `Preparing`/`Parameters` pair from a chunk of MyBatis log.
 * Returns `null` if no `Preparing` line is found.
 */
export function parseMybatisLog(input: string): ParsedMybatisLog | null {
  const preparingLine = findLine(input, /Preparing:\s*/);
  if (!preparingLine) {
    return null;
  }

  const template = unescapeSqlText(preparingLine.sql);
  const parametersLine = findLine(input, /Parameters:\s*/);
  const rawParameters = parametersLine ? splitParameters(parametersLine.tail) : [];
  const parameters = rawParameters.map(parseParameter);

  if (rawParameters.length > 0 && rawParameters.length !== countSubstitutablePlaceholders(template)) {
    // Best effort: keep going but flag the mismatch via a toast. We do not
    // throw because partial logs (e.g. only the Preparing line) are valid
    // inputs the user may want to format.
  }

  const sql = substitutePlaceholders(template, parameters);
  return { sql, parameters, template };
}

function findLine(input: string, prefix: RegExp): { sql: string; tail: string } | null {
  const lines = input.split(/\r?\n/);
  for (const line of lines) {
    const match = prefix.exec(line);
    if (!match) continue;
    const sql = line.slice(match.index + match[0].length);
    return { sql, tail: sql };
  }
  return null;
}

/**
 * MyBatis encodes real newlines/tabs as `\n` / `\t` in its log. Convert
 * those back to whitespace so the formatted SQL reads naturally.
 */
function unescapeSqlText(sql: string): string {
  return sql.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\r/g, "\r");
}

/**
 * Split a `Parameters:` line into individual tokens. Tokens are separated by
 * `, ` (comma + space) but a value may legitimately contain a comma without
 * a trailing space. To keep things simple we first try the obvious split,
 * then re-merge any tokens that do not have a balanced `(Type)` suffix.
 *
 * MyBatis 对 `null` 绑定值只打印字面量 `null`、不带 `(Type)` 后缀（非空值
 * 才会附加类型，如 `1(Integer)`）。因此一个独立的 `null` token 本身就是
 * 完整参数，不能并入下一个带类型的 token，否则会造成参数错位、占位符
 * 替换整体偏移。
 */
export function splitParameters(text: string): string[] {
  const tokens = text.split(/,\s+/);
  const result: string[] = [];
  let buffer: string[] = [];
  for (const token of tokens) {
    buffer.push(token);
    if (token === "null" || /\([^()]*\)\s*$/.test(token)) {
      result.push(buffer.join(", "));
      buffer = [];
    }
  }
  if (buffer.length > 0) {
    result.push(buffer.join(", "));
  }
  return result;
}

/**
 * Extract the `(Type)` suffix from a single parameter token. If no suffix
 * is found we default to `String`, which mirrors MyBatis' behaviour for
 * un-typed loggers (e.g. when only the raw text is shown).
 */
export function parseParameter(token: string): ParsedParameter {
  const match = /^(.*)\(([^()]*)\)\s*$/.exec(token);
  if (!match) {
    return { raw: token, value: token, type: "String" };
  }
  return { raw: token, value: match[1].trim(), type: match[2].trim() };
}

/**
 * Count placeholders that are safe to substitute (i.e. outside string
 * literals and SQL comments). See {@link forEachSubstitutablePlaceholder}.
 */
export function countSubstitutablePlaceholders(sql: string): number {
  let count = 0;
  forEachSubstitutablePlaceholder(sql, () => {
    count += 1;
  });
  return count;
}

/**
 * Replace every substitutable `?` placeholder in `template` with the
 * formatted value of the next parameter in `parameters`. Unbound or
 * non-substitutable placeholders stay as `?` so the user can spot them.
 *
 * A placeholder is "substitutable" when it sits in SQL syntax context —
 * i.e. NOT inside a single-quoted string, a double-quoted identifier,
 * a `--` line comment or a `/* … *\/` block comment. The check is done by
 * a small character-level state scanner.
 */
export function substitutePlaceholders(template: string, parameters: ParsedParameter[]): string {
  let index = 0;
  let cursor = 0;
  let out = "";
  // callback 拿到每个 `?` 的起始下标，我们据此把 SQL 模板字符原样拼回 `out`，
  // 再用参数值替换 `?`；若参数不足则保留原 `?` 便于用户定位遗漏。
  forEachSubstitutablePlaceholder(template, (placeholderStart) => {
    out += template.slice(cursor, placeholderStart);
    if (index >= parameters.length) {
      out += "?";
    } else {
      out += formatParameter(parameters[index]);
    }
    index += 1;
    cursor = placeholderStart + 1;
  });
  out += template.slice(cursor);
  return out;
}

/**
 * Walk the SQL string and call `onPlaceholder` for every `?` that is
 * NOT inside a string literal or comment. The function appends untouched
 * characters (including `?` inside strings/comments) to the result via
 * the {@link SqlScanner} accumulator helper, so the caller can use it
 * either to count placeholders, replace them, or both.
 */
function forEachSubstitutablePlaceholder(sql: string, onPlaceholder: (placeholderStart: number) => void): void {
  const scanner = new SqlScanner(sql);
  while (!scanner.atEnd()) {
    if (scanner.consumePlaceholder()) {
      // consumePlaceholder 已把游标推到 `?` 之后；回退一格即占位符起始下标。
      onPlaceholder(scanner.getIndex() - 1);
    }
  }
}

/**
 * 极简 SQL 词法扫描器：跟踪当前字符是否位于单引号串、双引号串、
 * 行注释或块注释内。仅用于判定 `?` 是否处于可替换上下文。
 */
class SqlScanner {
  private index = 0;

  constructor(private readonly source: string) {}

  atEnd(): boolean {
    return this.index >= this.source.length;
  }

  /** 当前游标位置（即下一个待消费的字符下标）。 */
  getIndex(): number {
    return this.index;
  }

  /**
   * 跳过从当前位置开始的一段 SQL 字符串 / 注释 / 单字符，
   * 总是把游标向前推进。调用方在循环里反复调用直至遇到 `?` 或到达末尾。
   */
  private skipOne(): void {
    if (this.atEnd()) return;
    const ch = this.source[this.index];
    const next = this.source[this.index + 1];
    // 单引号字符串：'...'，支持 '' 转义为字面量 '。
    if (ch === "'") {
      this.index += 1;
      while (!this.atEnd()) {
        if (this.source[this.index] === "'") {
          if (this.source[this.index + 1] === "'") {
            this.index += 2;
            continue;
          }
          this.index += 1;
          return;
        }
        this.index += 1;
      }
      return;
    }
    // 双引号字符串："..."，支持 "" 转义。
    if (ch === '"') {
      this.index += 1;
      while (!this.atEnd()) {
        if (this.source[this.index] === '"') {
          if (this.source[this.index + 1] === '"') {
            this.index += 2;
            continue;
          }
          this.index += 1;
          return;
        }
        this.index += 1;
      }
      return;
    }
    // 行注释：-- 起，直到换行；MyBatis 实际日志中注释极少，简单按见到 `--` 处理。
    if (ch === "-" && next === "-") {
      this.index += 2;
      while (!this.atEnd() && this.source[this.index] !== "\n") {
        this.index += 1;
      }
      return;
    }
    // 块注释：/* ... */，支持嵌套（MySQL 风格）。
    if (ch === "/" && next === "*") {
      this.index += 2;
      let depth = 1;
      while (!this.atEnd() && depth > 0) {
        if (this.source[this.index] === "/" && this.source[this.index + 1] === "*") {
          depth += 1;
          this.index += 2;
          continue;
        }
        if (this.source[this.index] === "*" && this.source[this.index + 1] === "/") {
          depth -= 1;
          this.index += 2;
          continue;
        }
        this.index += 1;
      }
      return;
    }
    this.index += 1;
  }

  /**
   * 把游标推进到下一个 `?` 所在的位置（SQL 语法上下文），
   * 返回 true 表示找到了一个可替换的 `?`，并已将其消耗。
   */
  consumePlaceholder(): boolean {
    while (!this.atEnd() && this.source[this.index] !== "?") {
      this.skipOne();
    }
    if (this.atEnd() || this.source[this.index] !== "?") {
      return false;
    }
    this.index += 1;
    return true;
  }
}

const NUMERIC_TYPES = new Set([
  "Integer",
  "int",
  "Long",
  "long",
  "Short",
  "short",
  "Byte",
  "byte",
  "Float",
  "float",
  "Double",
  "double",
  "BigDecimal",
  "BigInteger",
  "Number",
]);

/** Render a parameter as a SQL literal. */
export function formatParameter(param: ParsedParameter): string {
  const type = param.type;
  const value = param.value;

  if (type === "null" || value === "null") {
    return "NULL";
  }
  if (type === "Boolean" || type === "boolean") {
    if (value === "true" || value === "false") {
      return value.toUpperCase();
    }
    return `'${escapeString(value)}'`;
  }
  if (NUMERIC_TYPES.has(type)) {
    return value;
  }
  return `'${escapeString(value)}'`;
}

/** Escape single quotes (and backslashes) for SQL string literals. */
function escapeString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

/**
 * Very small helper: turn a `SELECT ...` SQL into a best-effort
 * `INSERT INTO ...` template using the same column list. Intended as a
 * quick copy action for developers who want to seed data; not a general
 * SQL parser.
 *
 * 列切分遵循 SQL 括号配对规则：函数调用内的逗号（如 `CONCAT(a, ', ', b)`）
 * 不被视为列分隔；具体实现见 {@link splitSelectColumns}。
 */
function toInsertStatement(sql: string): string {
  const match = /^\s*SELECT\s+([\s\S]+?)\s+FROM\s+([\w."`]+)/i.exec(sql);
  if (!match) {
    return sql;
  }
  const columns = splitSelectColumns(match[1])
    .map((part) => part.replace(/\s+AS\s+\w+/i, "").trim())
    .filter(Boolean);
  if (columns.length === 0) {
    return sql;
  }
  const table = match[2];
  const columnList = columns.join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  return `INSERT INTO ${table} (${columnList}) VALUES (${placeholders});`;
}

/**
 * Split a SELECT projection list into individual column expressions.
 *
 * Naive `split(",")` is unsafe because projection expressions may contain
 * commas inside function calls (e.g. `CONCAT(a, ', ', b)`) or inside
 * nested parentheses. This walker treats top-level commas (depth = 0,
 * outside string literals) as separators only.
 */
export function splitSelectColumns(projection: string): string[] {
  const columns: string[] = [];
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let buffer = "";

  for (let i = 0; i < projection.length; i += 1) {
    const ch = projection[i];
    const next = projection[i + 1];
    if (inSingle) {
      buffer += ch;
      if (ch === "'" && next === "'") {
        buffer += next;
        i += 1;
        continue;
      }
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      buffer += ch;
      if (ch === '"' && next === '"') {
        buffer += next;
        i += 1;
        continue;
      }
      if (ch === '"') inDouble = false;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      buffer += ch;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      buffer += ch;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      buffer += ch;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      buffer += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      columns.push(buffer);
      buffer = "";
      continue;
    }
    buffer += ch;
  }
  columns.push(buffer);
  return columns.map((c) => c.trim()).filter((c) => c.length > 0);
}

/* ------------------------------------------------------------------------ */
/*  UI helpers                                                               */
/* ------------------------------------------------------------------------ */

function buildMetadata(parsed: ParsedMybatisLog) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="参数" text={`${parsed.parameters.length}`} icon={Icon.List} />
      <Detail.Metadata.Label
        title="模板"
        text={parsed.template.length > 80 ? `${parsed.template.slice(0, 77)}…` : parsed.template}
      />
      <Detail.Metadata.Separator />
      {parsed.parameters.length === 0 ? (
        <Detail.Metadata.Label title="（无参数）" text="" icon={Icon.Minus} />
      ) : (
        parsed.parameters.map((p, i) => (
          <Detail.Metadata.Label
            key={i}
            title={`#${i + 1}  ${p.type}`}
            text={previewValue(p.value)}
            icon={Icon.Circle}
          />
        ))
      )}
    </Detail.Metadata>
  );
}

function previewValue(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 60) return trimmed;
  return `${trimmed.slice(0, 57)}…`;
}
