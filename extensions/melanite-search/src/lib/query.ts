/**
 * melanite.db に投げる SELECT を組み立てる。
 *
 * useSQL は文字列としてクエリを受け取るのでプレースホルダが使えない。
 * 検索文字列は必ず sqlString() / likeLiteral() を通してから埋め込むこと。
 */
import type { SortOrder } from "./library";

export type KindFilter = "all" | "note" | "image" | "video" | "audio" | "document" | "other";

export interface ItemRow {
  id: string;
  display_name: string;
  file_name: string;
  ext: string;
  kind: string;
  size: number;
  memo: string;
  excerpt: string | null;
  width: number | null;
  height: number | null;
  starred: number;
  imported_at: number;
  modified_at: number;
  created_at: number;
  /** json_group_array の結果 (文字列)。空なら "[]" */
  tags_json: string;
}

export interface TagRef {
  name: string;
  color: string | null;
}

const SORT_SQL: Record<SortOrder, string> = {
  modified: "i.modified_at DESC",
  imported: "i.imported_at DESC",
  created: "i.created_at DESC",
  // 本体の自然順照合 (natural_ci) は Rust 側で登録するものなのでここでは使えない
  name: "i.display_name COLLATE NOCASE ASC",
};

/** SQL の文字列リテラルにする */
export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** LIKE の部分一致パターン。%, _, \ はエスケープする (ESCAPE '\' 前提) */
export function likeLiteral(term: string): string {
  const escaped = term.replace(/[\\%_]/g, (c) => `\\${c}`);
  return sqlString(`%${escaped}%`);
}

export interface SearchTerm {
  /** 検索語 (正規化済み) */
  text: string;
  /** "#タグ" のようにタグだけを対象にする語か */
  tagOnly: boolean;
}

/**
 * 検索文字列を空白区切りの語に分解する。語同士は AND。
 * 先頭の "#" はタグ名だけに絞る指定。
 *
 * NFC に正規化するのは本体と同じ理由 (docs/02 §7)。DB 側は NFC で入っているので、
 * NFD のまま比較すると濁点付きの日本語などが一致しない。
 */
export function parseSearch(input: string): SearchTerm[] {
  return input
    .normalize("NFC")
    .split(/\s+/)
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0 && raw !== "#")
    .map((raw) => (raw.startsWith("#") ? { text: raw.slice(1), tagOnly: true } : { text: raw, tagOnly: false }));
}

function tagExists(pattern: string): string {
  return `EXISTS (SELECT 1 FROM item_tags it
                    JOIN tags t ON t.id = it.tag_id
                   WHERE it.item_id = i.id AND t.name LIKE ${pattern} ESCAPE '\\')`;
}

function termCondition(term: SearchTerm, searchMemo: boolean): string {
  const pattern = likeLiteral(term.text);
  if (term.tagOnly) {
    return tagExists(pattern);
  }
  const parts = [
    `i.display_name LIKE ${pattern} ESCAPE '\\'`,
    `i.file_name LIKE ${pattern} ESCAPE '\\'`,
    ...(searchMemo ? [`i.memo LIKE ${pattern} ESCAPE '\\'`] : []),
    tagExists(pattern),
  ];
  return `(${parts.join(" OR ")})`;
}

export interface BuildOptions {
  search: string;
  kind: KindFilter;
  sortOrder: SortOrder;
  limit: number;
  searchMemo: boolean;
}

export function buildItemsQuery({ search, kind, sortOrder, limit, searchMemo }: BuildOptions): string {
  const where = ["i.trashed_at IS NULL"];
  if (kind !== "all") {
    where.push(`i.kind = ${sqlString(kind)}`);
  }
  for (const term of parseSearch(search)) {
    where.push(termCondition(term, searchMemo));
  }

  return `SELECT i.id,
       i.display_name,
       i.file_name,
       i.ext,
       i.kind,
       i.size,
       i.memo,
       i.excerpt,
       i.width,
       i.height,
       i.starred,
       i.imported_at,
       i.modified_at,
       i.created_at,
       (SELECT json_group_array(json_object('name', t.name, 'color', g.color))
          FROM item_tags it
          JOIN tags t ON t.id = it.tag_id
          LEFT JOIN tag_groups g ON g.id = t.group_id
         WHERE it.item_id = i.id) AS tags_json
  FROM items i
 WHERE ${where.join("\n   AND ")}
 ORDER BY ${SORT_SQL[sortOrder]}
 LIMIT ${Math.max(1, Math.floor(limit))}`;
}

export function parseTags(tagsJson: string | null): TagRef[] {
  if (!tagsJson) return [];
  try {
    const parsed: unknown = JSON.parse(tagsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is TagRef => typeof t === "object" && t !== null && typeof (t as TagRef).name === "string")
      .map((t) => ({ name: t.name, color: t.color ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  } catch {
    return [];
  }
}
