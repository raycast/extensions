/**
 * Melanite のライブラリフォルダ構造の知識をここに閉じ込める。
 * (本体側の src-tauri/src/library/mod.rs と対応)
 *
 *   MyLibrary.melanite/
 *   ├── melanite.json   フォーマットバージョン
 *   ├── melanite.db     SQLite (この拡張は読み取り専用で開く)
 *   ├── files/<ulid>/<ファイル名>
 *   ├── thumbs/<ulid>.webp
 *   └── trash/<ulid>/…
 */
import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type SortOrder = "modified" | "imported" | "created" | "name";

export interface MelanitePreferences {
  libraryPath: string;
  sortOrder: SortOrder;
  resultLimit: string;
  searchMemo: boolean;
}

export interface Library {
  /** .melanite フォルダの絶対パス */
  root: string;
  /** melanite.db の絶対パス */
  dbPath: string;
  /** ライブラリとして開ける状態か */
  valid: boolean;
  /** valid でないときの理由 (ローカライズしない短い説明) */
  problem?: string;
}

function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return path.join(homedir(), p.slice(2));
  return p;
}

export function getPreferences(): MelanitePreferences {
  const prefs = getPreferenceValues<MelanitePreferences>();
  return {
    ...prefs,
    libraryPath: expandHome((prefs.libraryPath ?? "").trim()),
    sortOrder: prefs.sortOrder ?? "modified",
    resultLimit: prefs.resultLimit ?? "100",
  };
}

export function resolveLibrary(libraryPath: string): Library {
  const root = path.resolve(libraryPath);
  const dbPath = path.join(root, "melanite.db");

  if (!libraryPath) {
    return { root, dbPath, valid: false, problem: "No library folder is set in the extension preferences." };
  }
  if (!existsSync(root)) {
    return { root, dbPath, valid: false, problem: `The folder does not exist: ${root}` };
  }
  if (!existsSync(path.join(root, "melanite.json"))) {
    return { root, dbPath, valid: false, problem: `Not a Melanite library (melanite.json is missing): ${root}` };
  }
  if (!existsSync(dbPath)) {
    return { root, dbPath, valid: false, problem: `melanite.db is missing in ${root}` };
  }
  return { root, dbPath, valid: true };
}

/** ファイル実体のパス: <root>/files/<id>/<file_name> */
export function itemFilePath(library: Library, id: string, fileName: string): string {
  return path.join(library.root, "files", id, fileName);
}

/** アイテムのフォルダ: <root>/files/<id> */
export function itemFolderPath(library: Library, id: string): string {
  return path.join(library.root, "files", id);
}

/** サムネイル: <root>/thumbs/<id>.webp。無ければ undefined */
export function thumbPath(library: Library, id: string): string | undefined {
  const p = path.join(library.root, "thumbs", `${id}.webp`);
  return existsSync(p) ? p : undefined;
}

/**
 * markdown の画像 (`![](…)`) に埋め込めるパスにする。
 *
 * Raycast は画像のソースに絶対パスをそのまま受け取る (file:// にはしない)。
 * 空白や括弧を含むファイル名があるので destination は CommonMark の山括弧記法
 * `![](<path>)` で囲む前提とし、その記法を壊す文字だけを潰す。
 * `?` はクエリパラメータ (raycast-width) と区別できなくなるので同様。
 * Melanite 側のファイル名サニタイズでこれらはまず現れないが、念のため。
 */
export function markdownImagePath(absolutePath: string): string {
  return absolutePath.replace(/[<>?#]/g, (c) => encodeURIComponent(c));
}
