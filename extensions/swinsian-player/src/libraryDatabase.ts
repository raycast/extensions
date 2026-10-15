import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type LibraryBrowseMode = "artist" | "albumArtist" | "album" | "genre" | "year";

export interface LibraryFacetRow {
  value: string;
  title: string;
  subtitle?: string;
  artist?: string;
  year?: number;
  count: number;
}

export interface LibraryTrackRow {
  name: string;
  artist: string;
  album: string;
  duration: number;
  time: string;
  rating: number;
  id: string;
  path: string;
}

export interface ArtistAlbumRow {
  album: string;
  artist: string;
  year: number;
  count: number;
}

interface SqliteFacetRow {
  value: string | number;
  title: string | number;
  subtitle?: string | number | null;
  artist?: string | number | null;
  year?: number | null;
  count: number;
}

interface SqliteTrackRow {
  name?: string | null;
  artist?: string | null;
  album?: string | null;
  duration?: number | null;
  rating?: number | null;
  id: string | number;
  path?: string | null;
}

interface SqliteArtistAlbumRow {
  album: string;
  artist: string;
  year: number;
  count: number;
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function boundedInteger(value: number, maximum: number): number {
  if (!Number.isFinite(value)) return maximum;
  return Math.max(1, Math.min(maximum, Math.trunc(value)));
}

function facetExpressions(mode: LibraryBrowseMode): {
  value: string;
  subtitle: string;
  subtitleAggregate: string;
  artistAggregate: string;
  yearAggregate: string;
  groupBy: string;
  count: string;
  order: string;
} {
  switch (mode) {
    case "artist":
      return {
        value: "artist",
        subtitle: "COALESCE(NULLIF(genre, ''), '')",
        subtitleAggregate: "MIN(NULLIF(subtitle, ''))",
        artistAggregate: "''",
        yearAggregate: "0",
        groupBy: "value",
        count: "COUNT(DISTINCT NULLIF(album, ''))",
        order: "title COLLATE NOCASE",
      };
    case "albumArtist":
      return {
        value: "COALESCE(NULLIF(albumartist, ''), artist)",
        subtitle: "COALESCE(NULLIF(genre, ''), '')",
        subtitleAggregate: "MIN(NULLIF(subtitle, ''))",
        artistAggregate: "''",
        yearAggregate: "0",
        groupBy: "value",
        count: "COUNT(DISTINCT NULLIF(album, ''))",
        order: "title COLLATE NOCASE",
      };
    case "album":
      return {
        value: "album",
        subtitle:
          "COALESCE(NULLIF(albumartist, ''), artist, '') || CASE WHEN year > 0 THEN ' • ' || CAST(year AS TEXT) ELSE '' END",
        subtitleAggregate: "MAX(subtitle)",
        artistAggregate: "MAX(effective_artist)",
        yearAggregate: "MAX(year)",
        groupBy: "value, effective_artist",
        count: "COUNT(*)",
        order: "title COLLATE NOCASE",
      };
    case "genre":
      return {
        value: "genre",
        subtitle: "''",
        subtitleAggregate: "MAX(subtitle)",
        artistAggregate: "''",
        yearAggregate: "0",
        groupBy: "value",
        count: "COUNT(*)",
        order: "title COLLATE NOCASE",
      };
    case "year":
      return {
        value: "CAST(year AS TEXT)",
        subtitle: "''",
        subtitleAggregate: "MAX(subtitle)",
        artistAggregate: "''",
        yearAggregate: "0",
        groupBy: "value",
        count: "COUNT(*)",
        order: "CAST(value AS INTEGER) DESC",
      };
  }
}

function facetPredicate(mode: LibraryBrowseMode, value: string, artist?: string): string {
  const literal = sqlString(value);
  switch (mode) {
    case "artist":
      return `artist = ${literal}`;
    case "albumArtist":
      return `COALESCE(NULLIF(albumartist, ''), artist) = ${literal}`;
    case "album":
      return artist
        ? `album = ${literal} AND COALESCE(NULLIF(albumartist, ''), artist) = ${sqlString(artist)}`
        : `album = ${literal}`;
    case "genre":
      return `genre = ${literal}`;
    case "year":
      return `year = ${Number.parseInt(value, 10) || 0}`;
  }
}

function artistPredicate(mode: "artist" | "albumArtist", artist: string): string {
  const literal = sqlString(artist);
  return mode === "artist" ? `artist = ${literal}` : `COALESCE(NULLIF(albumartist, ''), artist) = ${literal}`;
}

async function queryJson<T>(databasePath: string, sql: string): Promise<T[]> {
  const { stdout } = await execFileAsync("/usr/bin/sqlite3", ["-readonly", "-batch", "-json", databasePath, sql], {
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout.trim() ? (JSON.parse(stdout) as T[]) : [];
}

export async function queryLibraryFacets(
  databasePath: string,
  mode: LibraryBrowseMode,
  query = "",
  limit = 5000,
): Promise<LibraryFacetRow[]> {
  const expressions = facetExpressions(mode);
  const needle = `%${query.trim()}%`;
  const resultLimit = boundedInteger(limit, 5000);
  const sql = `
    WITH source AS (
      SELECT ${expressions.value} AS value,
             ${expressions.subtitle} AS subtitle,
             COALESCE(NULLIF(albumartist, ''), artist, '') AS effective_artist,
             COALESCE(album, '') AS album,
             COALESCE(year, 0) AS year
      FROM track
      WHERE enabled = 1
    ),
    grouped AS (
      SELECT value,
             ${expressions.subtitleAggregate} AS subtitle,
             ${expressions.artistAggregate} AS artist,
             ${expressions.yearAggregate} AS year,
             ${expressions.count} AS count
      FROM source
      WHERE TRIM(COALESCE(value, '')) <> ''
      GROUP BY ${expressions.groupBy}
    )
    SELECT CAST(value AS TEXT) AS value,
           CAST(value AS TEXT) AS title,
           NULLIF(subtitle, '') AS subtitle,
           NULLIF(artist, '') AS artist,
           year,
           count
    FROM grouped
    WHERE ${sqlString(query.trim())} = ''
       OR LOWER(CAST(value AS TEXT)) LIKE LOWER(${sqlString(needle)})
       OR LOWER(COALESCE(subtitle, '')) LIKE LOWER(${sqlString(needle)})
    ORDER BY ${expressions.order}
    LIMIT ${resultLimit};
  `;
  const rows = await queryJson<SqliteFacetRow>(databasePath, sql);
  return rows.map((row) => {
    const facet: LibraryFacetRow = {
      value: String(row.value),
      title: String(row.title),
      count: Number(row.count) || 0,
    };
    if (row.subtitle != null && row.subtitle !== "") facet.subtitle = String(row.subtitle);
    if (mode === "album") {
      if (row.artist != null && row.artist !== "") facet.artist = String(row.artist);
      facet.year = Number(row.year) || 0;
    }
    return facet;
  });
}

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function mapTrackRows(rows: SqliteTrackRow[]): LibraryTrackRow[] {
  return rows.map((row) => {
    const duration = Number(row.duration) || 0;
    return {
      name: row.name ?? "",
      artist: row.artist ?? "",
      album: row.album ?? "",
      duration,
      time: formatDuration(duration),
      rating: Number(row.rating) || 0,
      id: String(row.id),
      path: row.path ?? "",
    };
  });
}

export async function queryLibraryTracksByFacet(
  databasePath: string,
  mode: LibraryBrowseMode,
  value: string,
  query = "",
  limit = 100,
  artist?: string,
): Promise<LibraryTrackRow[]> {
  const needle = `%${query.trim()}%`;
  const resultLimit = boundedInteger(limit, 500);
  const sql = `
    SELECT COALESCE(title, '') AS name,
           COALESCE(artist, '') AS artist,
           COALESCE(album, '') AS album,
           COALESCE(length, 0) AS duration,
           COALESCE(rating, 0) AS rating,
           track_id AS id,
           COALESCE(path, '') AS path
    FROM track
    WHERE enabled = 1
      AND ${facetPredicate(mode, value, artist)}
      AND (
        ${sqlString(query.trim())} = ''
        OR LOWER(COALESCE(title, '')) LIKE LOWER(${sqlString(needle)})
        OR LOWER(COALESCE(artist, '')) LIKE LOWER(${sqlString(needle)})
        OR LOWER(COALESCE(album, '')) LIKE LOWER(${sqlString(needle)})
      )
    ORDER BY COALESCE(album, '') COLLATE NOCASE, discnumber, tracknumber, COALESCE(title, '') COLLATE NOCASE
    LIMIT ${resultLimit};
  `;
  return mapTrackRows(await queryJson<SqliteTrackRow>(databasePath, sql));
}

export async function queryArtistAlbums(
  databasePath: string,
  mode: "artist" | "albumArtist",
  artist: string,
  query = "",
  limit = 1000,
): Promise<ArtistAlbumRow[]> {
  const needle = `%${query.trim()}%`;
  const resultLimit = boundedInteger(limit, 1000);
  const sql = `
    SELECT album,
           ${sqlString(artist)} AS artist,
           MAX(COALESCE(year, 0)) AS year,
           COUNT(*) AS count
    FROM track
    WHERE enabled = 1
      AND ${artistPredicate(mode, artist)}
      AND TRIM(COALESCE(album, '')) <> ''
      AND (
        ${sqlString(query.trim())} = ''
        OR LOWER(album) LIKE LOWER(${sqlString(needle)})
      )
    GROUP BY album
    ORDER BY MAX(COALESCE(year, 0)) DESC, album COLLATE NOCASE
    LIMIT ${resultLimit};
  `;
  return queryJson<SqliteArtistAlbumRow>(databasePath, sql);
}

export async function queryArtistAlbumTracks(
  databasePath: string,
  mode: "artist" | "albumArtist",
  artist: string,
  album: string,
  query = "",
  limit = 500,
): Promise<LibraryTrackRow[]> {
  const needle = `%${query.trim()}%`;
  const resultLimit = boundedInteger(limit, 500);
  const sql = `
    SELECT COALESCE(title, '') AS name,
           COALESCE(artist, '') AS artist,
           COALESCE(album, '') AS album,
           COALESCE(length, 0) AS duration,
           COALESCE(rating, 0) AS rating,
           track_id AS id,
           COALESCE(path, '') AS path
    FROM track
    WHERE enabled = 1
      AND ${artistPredicate(mode, artist)}
      AND album = ${sqlString(album)}
      AND (
        ${sqlString(query.trim())} = ''
        OR LOWER(COALESCE(title, '')) LIKE LOWER(${sqlString(needle)})
      )
    ORDER BY discnumber, tracknumber, COALESCE(title, '') COLLATE NOCASE
    LIMIT ${resultLimit};
  `;
  return mapTrackRows(await queryJson<SqliteTrackRow>(databasePath, sql));
}
