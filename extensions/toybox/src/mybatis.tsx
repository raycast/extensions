import { Action, ActionPanel, Clipboard, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
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
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="编辑输入"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
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

  if (rawParameters.length > 0 && rawParameters.length !== countPlaceholders(template)) {
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
 */
export function splitParameters(text: string): string[] {
  const tokens = text.split(/,\s+/);
  const result: string[] = [];
  let buffer: string[] = [];
  for (const token of tokens) {
    buffer.push(token);
    if (/\([^()]*\)\s*$/.test(token)) {
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

function countPlaceholders(sql: string): number {
  return (sql.match(/\?/g) ?? []).length;
}

/**
 * Replace every `?` placeholder in `template` with the formatted value of
 * the next parameter in `parameters`. Unbound placeholders stay as `?`
 * so the user can spot missing parameters.
 */
export function substitutePlaceholders(template: string, parameters: ParsedParameter[]): string {
  let index = 0;
  return template.replace(/\?/g, () => {
    if (index >= parameters.length) {
      index += 1;
      return "?";
    }
    const param = parameters[index];
    index += 1;
    return formatParameter(param);
  });
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
 */
function toInsertStatement(sql: string): string {
  const match = /^\s*SELECT\s+([\s\S]+?)\s+FROM\s+([\w."`]+)/i.exec(sql);
  if (!match) {
    return sql;
  }
  const columns = match[1]
    .split(",")
    .map((part) => part.trim())
    .map((part) => part.replace(/\s+AS\s+\w+/i, ""))
    .filter(Boolean);
  if (columns.length === 0) {
    return sql;
  }
  const table = match[2];
  const columnList = columns.map((c) => c).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  return `INSERT INTO ${table} (${columnList}) VALUES (${placeholders});`;
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
