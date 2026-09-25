import { Color, Icon } from "@raycast/api";

const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

/** items の日時カラムはエポック秒 (UTC)。表示はローカル */
export function formatDate(epochSeconds: number): string {
  if (!epochSeconds) return "-";
  return new Date(epochSeconds * 1000).toLocaleString();
}

export function kindIcon(kind: string): Icon {
  switch (kind) {
    case "note":
      return Icon.Text;
    case "image":
      return Icon.Image;
    case "video":
      return Icon.Video;
    case "audio":
      return Icon.Music;
    case "document":
      return Icon.Document;
    default:
      return Icon.Dot;
  }
}

export function kindLabel(kind: string): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

/**
 * tag_groups.color は '#RRGGBB' か NULL。
 * Raycast の Color は 16 進文字列をそのまま受け取れる。
 */
export function tagColor(color: string | null): Color.ColorLike {
  return /^#[0-9a-fA-F]{6}$/.test(color ?? "") ? (color as Color.ColorLike) : Color.SecondaryText;
}

/**
 * 一覧に出す「拡張子付きの名前」。本体の `lib/itemName.ts` の `nameWithExt()` と同じ規則
 * (ADR 70): `display_name + "." + ext` で組み立て、DB の `file_name` は使わない。
 *
 * `display_name` は拡張子を含まない名前なので、そのままだと同名の `.md` と `.pdf` を
 * 選び分けられない。`file_name` を使わないのは、リネーム時にサニタイズが掛かって
 * 実体名が表示名とずれることがあるため。
 *
 * 本体の一覧は設定 (外観 → 拡張子を表示) で切り替えられるが、こちらは常に付ける。
 * 名前だけが手掛かりになる場所 — 本体のクイックオープンやリンク候補 — と同じ立場で、
 * 拡張子が無いと選び分けが成り立たないため。
 */
export function itemName(item: { display_name: string; ext: string }): string {
  return item.ext ? `${item.display_name}.${item.ext}` : item.display_name;
}
