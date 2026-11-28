import { Board, Save, SubBoard } from "./types";

const SAVE_LINK = /savee\.com\/i\/([A-Za-z0-9_-]+)/;

export function getSourceHost(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function getSaveTitle(save: Pick<Save, "name" | "source_url">): string {
  const name = save.name?.trim();
  if (name) {
    return name;
  }

  return getSourceHost(save.source_url) ?? "Untitled";
}

/** Accepts a savee.com link, a short id or an id. */
export function parseSaveId(input: string): string {
  const trimmed = input.trim();
  return trimmed.match(SAVE_LINK)?.[1] ?? trimmed;
}

function words(text: string | null | undefined): string[] {
  return (text ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}#]+/u)
    .filter((word) => word.length > 2);
}

/** Extra words Raycast filters on, beyond the title: source, author, colours and the visual description. */
export function getSaveKeywords(save: Save): string[] {
  const keywords = new Set<string>();
  const host = getSourceHost(save.source_url);

  if (host) {
    keywords.add(host);
    host.split(".").forEach((part) => keywords.add(part));
  }

  if (save.user) {
    keywords.add(save.user.username);
    words(save.user.name).forEach((word) => keywords.add(word));
  }

  save.colors.forEach(({ color }) => keywords.add(color.toLowerCase()));
  words(save.detected_aesthetics).forEach((word) => keywords.add(word));
  keywords.add(save.media.type);

  return [...keywords];
}

export function getSaveSearchText(save: Save): string {
  return [
    save.name,
    save.source_url,
    save.detected_aesthetics,
    save.user?.username,
    save.user?.name,
    save.media.type,
    ...save.colors.map(({ color }) => color),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Every word in the query has to appear somewhere in the save. */
export function matchesQuery(save: Save, query: string | undefined): boolean {
  const terms = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return true;
  }

  const text = getSaveSearchText(save);
  return terms.every((term) => text.includes(term));
}

export function formatDimensions(save: Save): string {
  return save.media.width + " × " + save.media.height;
}

export function formatSavedBy(count: number): string {
  return count === 1 ? "1 person" : count.toLocaleString("en-US") + " people";
}

export function getMediaExtension(url: string, contentType: string | null | undefined): string {
  const type = (contentType ?? "").toLowerCase();
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  if (type.includes("webp")) return "webp";
  if (type.includes("avif")) return "avif";
  if (type.includes("mp4")) return "mp4";
  if (type.includes("quicktime")) return "mov";

  try {
    const match = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i);
    if (match) return match[1].toLowerCase();
  } catch {
    // fall through
  }

  return "jpg";
}

export function getMediaFileName(save: Save, extension: string): string {
  const title = getSaveTitle(save)
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return (title ? title + " " : "") + "(" + save.short_id + ")." + extension;
}

export type FlatBoard = SubBoard & {
  parent?: SubBoard;
  title: string;
};

/** Boards, each followed by its sub boards (Savee nests one level). */
export function flattenBoards(boards: Board[]): FlatBoard[] {
  return boards.flatMap((board) => [
    { ...board, title: board.name },
    ...board.sub_boards.map((subBoard) => ({ ...subBoard, parent: board, title: board.name + " › " + subBoard.name })),
  ]);
}

export function formatSaveCount(count: number): string {
  return count === 1 ? "1 save" : count.toLocaleString("en-US") + " saves";
}

export function formatSaveForAI(save: Save) {
  return {
    id: save.id,
    shortId: save.short_id,
    title: getSaveTitle(save),
    saveeUrl: save.url,
    sourceUrl: save.source_url,
    savedAt: save.created_at,
    type: save.media.type,
    width: save.media.width,
    height: save.media.height,
    isPrivate: save.is_private,
    savedByCount: save.total_saves,
    colors: save.colors.slice(0, 5).map(({ color }) => color),
    description: save.detected_aesthetics,
    author: save.user?.username,
    image: save.media.thumbnail,
  };
}

export function formatBoardForAI(board: FlatBoard) {
  return {
    id: board.id,
    shortId: board.short_id,
    name: board.title,
    url: board.url,
    saves: board.saves_count,
    isPrivate: board.is_private,
    ownership: board.ownership_type,
    parentId: board.parent?.id,
  };
}
