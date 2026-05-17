import { existsSync } from "fs";
import { homedir } from "os";
import path from "path";
import { SearchResult, SourceContext, SourceOutput } from "../types";
import { parseQuery, run } from "./util";

type PhotoRow = {
  Z_PK: number;
  ZUUID: string | null;
  ZFILENAME: string | null;
  ZORIGINALFILENAME: string | null;
  ZTITLE: string | null;
  ZACCESSIBILITYDESCRIPTION: string | null;
  ZDIRECTORY: string | null;
  ZDATECREATED: number | null;
  ZKIND: number | null;
  ZPLAYBACKSTYLE: number | null;
  ZWIDTH: number | null;
  ZHEIGHT: number | null;
  ZUNIFORMTYPEIDENTIFIER: string | null;
};

let lastError: string | null = null;

export function getPhotosError(): string | null {
  return lastError;
}

function defaultPhotosLibraryPath(): string {
  return path.join(homedir(), "Pictures", "Photos Library.photoslibrary");
}

function expandHome(value: string): string {
  return value === "~" || value.startsWith("~/") ? path.join(homedir(), value.slice(2)) : value;
}

function sqlString(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

function likeLiteral(value: string): string {
  return sqlString(`%${value.replace(/[%_]/g, "\\$&").toLowerCase()}%`);
}

function appleDateToMs(value: number | null): number | undefined {
  if (value === null) return undefined;
  return Math.round((value + 978_307_200) * 1000);
}

function mediaTypeName(row: PhotoRow): string {
  if (row.ZPLAYBACKSTYLE === 4 || row.ZKIND === 1) return "video";
  return "photo";
}

function originalPath(libraryPath: string, row: PhotoRow): string | undefined {
  if (!row.ZDIRECTORY || !row.ZFILENAME) return undefined;
  const full = path.join(libraryPath, "originals", row.ZDIRECTORY, row.ZFILENAME);
  return existsSync(full) ? full : undefined;
}

async function searchPhotosDatabase(
  libraryPath: string,
  terms: string[],
  extensions: string[],
  excludes: string[],
  limit: number,
  signal: AbortSignal,
): Promise<PhotoRow[] | null> {
  const dbPath = path.join(libraryPath, "database", "Photos.sqlite");
  if (!existsSync(dbPath)) {
    lastError = `Photos library database not found at ${dbPath}.`;
    return null;
  }

  const conditions = ["a.ZTRASHEDSTATE = 0", "a.ZHIDDEN = 0", "a.ZVISIBILITYSTATE = 0", "a.ZCOMPLETE = 1"];
  for (const term of terms.map((t) => t.trim()).filter(Boolean)) {
    const like = likeLiteral(term);
    conditions.push(`(
      lower(coalesce(aa.ZORIGINALFILENAME, a.ZFILENAME, '')) like ${like} escape '\\'
      or lower(coalesce(aa.ZTITLE, '')) like ${like} escape '\\'
      or lower(coalesce(aa.ZACCESSIBILITYDESCRIPTION, '')) like ${like} escape '\\'
      or lower(coalesce(a.ZUNIFORMTYPEIDENTIFIER, '')) like ${like} escape '\\'
      or lower(coalesce(a.ZWIDTH, '') || 'x' || coalesce(a.ZHEIGHT, '')) like ${like} escape '\\'
    )`);
  }
  for (const exclude of excludes.map((t) => t.trim()).filter(Boolean)) {
    const like = likeLiteral(exclude);
    conditions.push(`not (
      lower(coalesce(aa.ZORIGINALFILENAME, a.ZFILENAME, '')) like ${like} escape '\\'
      or lower(coalesce(aa.ZTITLE, '')) like ${like} escape '\\'
      or lower(coalesce(aa.ZACCESSIBILITYDESCRIPTION, '')) like ${like} escape '\\'
      or lower(coalesce(a.ZUNIFORMTYPEIDENTIFIER, '')) like ${like} escape '\\'
    )`);
  }
  if (extensions.length > 0) {
    const extConditions = extensions.map(
      (ext) => `lower(coalesce(aa.ZORIGINALFILENAME, a.ZFILENAME, '')) like ${sqlString(`%.${ext.toLowerCase()}`)}`,
    );
    conditions.push(`(${extConditions.join(" or ")})`);
  }

  const sql = `
    select
      a.Z_PK,
      a.ZUUID,
      a.ZFILENAME,
      aa.ZORIGINALFILENAME,
      aa.ZTITLE,
      aa.ZACCESSIBILITYDESCRIPTION,
      a.ZDIRECTORY,
      a.ZDATECREATED,
      a.ZKIND,
      a.ZPLAYBACKSTYLE,
      a.ZWIDTH,
      a.ZHEIGHT,
      a.ZUNIFORMTYPEIDENTIFIER
    from ZASSET a
    left join ZADDITIONALASSETATTRIBUTES aa on aa.Z_PK = a.ZADDITIONALATTRIBUTES
    where ${conditions.join("\n      and ")}
    order by a.ZDATECREATED desc
    limit ${Math.max(1, limit)};
  `;

  let raw: string;
  try {
    raw = await run("/usr/bin/sqlite3", ["-readonly", "-json", dbPath, sql], signal, 50_000_000);
  } catch (e) {
    const message = (e as Error).message;
    lastError =
      message.includes("authorization denied") || message.includes("unable to open database")
        ? "Photos library is blocked. Grant Raycast Full Disk Access in System Settings → Privacy & Security → Full Disk Access."
        : `Photos database search failed: ${message}`;
    return null;
  }

  try {
    return JSON.parse(raw.trim() || "[]") as PhotoRow[];
  } catch {
    lastError = `Photos database returned non-JSON: ${raw.slice(0, 200)}`;
    return null;
  }
}

export async function searchPhotos(ctx: SourceContext): Promise<SourceOutput> {
  lastError = null;
  const empty = { results: [] as SearchResult[], total: 0 };
  const parsed = parseQuery(ctx.query);
  if (parsed.terms.length === 0 && parsed.extensions.length === 0) return empty;

  const libraryPath =
    expandHome((ctx as SourceContext & { photosLibraryPath?: string }).photosLibraryPath?.trim() || "") ||
    defaultPhotosLibraryPath();
  const rows = await searchPhotosDatabase(
    libraryPath,
    parsed.terms,
    parsed.extensions,
    ctx.exclude ?? [],
    ctx.limit,
    ctx.signal,
  );
  if (!rows) return empty;

  const results: SearchResult[] = rows.map((p) => {
    const filename = p.ZORIGINALFILENAME || p.ZFILENAME || p.ZUUID || String(p.Z_PK);
    const media = mediaTypeName(p);
    const createdAt = appleDateToMs(p.ZDATECREATED);
    const filePath = originalPath(libraryPath, p);
    return {
      id: "photo:" + (p.ZUUID || p.Z_PK),
      kind: "photo",
      title: filename,
      subtitle: [
        media,
        createdAt ? new Date(createdAt).toLocaleDateString() : "",
        `${p.ZWIDTH ?? "?"}x${p.ZHEIGHT ?? "?"}`,
      ]
        .filter(Boolean)
        .join(" · "),
      path: filePath,
      url: filePath ? undefined : "photos://",
      photoIdentifier: p.ZUUID || String(p.Z_PK),
      photoCreatedAt: createdAt,
      photoWidth: p.ZWIDTH ?? undefined,
      photoHeight: p.ZHEIGHT ?? undefined,
      matchPreview:
        [p.ZTITLE, p.ZACCESSIBILITYDESCRIPTION, p.ZUNIFORMTYPEIDENTIFIER].filter(Boolean).join(" · ") || undefined,
    };
  });

  return { results, total: results.length };
}
