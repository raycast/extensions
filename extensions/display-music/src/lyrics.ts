import { get as httpsGet } from "https";

export interface LyricsResult {
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export async function fetchLyrics(
  trackName: string,
  artistName: string,
  albumName: string,
): Promise<LyricsResult> {
  const params = new URLSearchParams({
    track_name: trackName,
    artist_name: artistName,
    album_name: albumName,
  });
  const url = `https://lrclib.net/api/get?${params.toString()}`;

  return new Promise((resolve) => {
    httpsGet(
      url,
      { headers: { "User-Agent": "DisplayMusic Raycast Extension/1.0" } },
      (response) => {
        if (response.statusCode !== 200) {
          resolve({ plainLyrics: null, syncedLyrics: null });
          return;
        }
        let data = "";
        response.on("data", (chunk: string) => (data += chunk));
        response.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve({
              plainLyrics: json.plainLyrics || null,
              syncedLyrics: json.syncedLyrics || null,
            });
          } catch {
            resolve({ plainLyrics: null, syncedLyrics: null });
          }
        });
        response.on("error", () =>
          resolve({ plainLyrics: null, syncedLyrics: null }),
        );
      },
    ).on("error", () => resolve({ plainLyrics: null, syncedLyrics: null }));
  });
}

export function formatLyricsAsMarkdown(
  trackName: string,
  artistName: string,
  albumName: string,
  lyrics: string,
  artworkPath: string | null,
): string {
  const lines: string[] = [];

  if (artworkPath) {
    lines.push(`![Album Artwork](${artworkPath})`);
    lines.push("");
  }

  lines.push(`# ${trackName}`);
  lines.push(`**${artistName}** — *${albumName}*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Convert single newlines to double newlines for Markdown line breaks
  // Also preserve empty lines as verse separators
  const formattedLyrics = lyrics
    .split("\n")
    .map((line) => (line.trim() === "" ? "\n&nbsp;\n" : line))
    .join("  \n");

  lines.push(formattedLyrics);

  return lines.join("\n");
}
