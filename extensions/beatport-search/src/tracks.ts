import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

interface Page {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
}

export interface Track extends Page {
  artist?: string;
  releaseDetail?: string;
  match?: "exact" | "url";
  urlTitle?: boolean;
}

export interface ChartEntry {
  rank: number;
  title: string;
  credits: string;
  trackUrl?: string;
  thumbnailUrl?: string;
}

export interface ArtistChoice extends Page {
  chart: ChartEntry[];
}

export interface Results {
  artistChoices?: ArtistChoice[];
  profile?: Page;
  mixSearch?: boolean;
  chart: ChartEntry[];
  tracks: Track[];
}

interface Hit {
  image?: unknown;
  url: string;
  title: string;
  text?: string | null;
}

// Exa returns both concrete CDN dimensions and literal {w}x{h} templates.
function thumbnailUrl(image: unknown) {
  if (typeof image !== "string") return;
  const file =
    /^https:\/\/geo-media\.beatport\.com\/image_size\/(?:\d+x\d+|\{w\}x\{h\})\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(?:jpe?g|png))$/i.exec(
      image,
    )?.[1];
  // Beatport serves this stock silhouette for artists without a portrait.
  if (!file || file.toLowerCase() === "0dc61986-bccf-49d4-8fad-6b147ea8f327.jpg") return;
  return "https://geo-media.beatport.com/image_size/64x64/" + file;
}

function nameKey(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

function creditedTo(credits: string, artist: string) {
  return [credits, ...credits.split(/\s*[,•]\s*/)].some((credit) => nameKey(credit) === nameKey(artist));
}

function topTen(text: string, artist: string): ChartEntry[] {
  const body = text.split(/^#{1,3}\s+Top (?:Ten|10) Tracks\s*$/im)[1]?.split(/^#{1,3}\s/m)[0] ?? "";
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const chart: ChartEntry[] = [];
  for (const [index, line] of lines.entries()) {
    if (!/^(?:[1-9]|10)$/.test(line)) continue;
    const rank = Number(line);
    const title = lines[index + 1];
    const credits = lines[index + 2];
    // The index often drops individual lines. Require adjacent rank, title and artist credit.
    if (!title || !credits || /^\d+$/.test(title) || !creditedTo(credits, artist) || creditedTo(title, artist))
      continue;
    if (chart.some((entry) => entry.rank === rank)) continue;
    chart.push({ rank, title, credits });
  }
  return chart.sort((a, b) => a.rank - b.rank);
}

const releaseFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function releaseDate(text?: string | null): string | undefined {
  const value = text?.match(/^Released:[ \t]*\r?\n\s*([\d/-]+)[ \t]*$/m)?.[1];
  const us = value?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/);
  const iso = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!us && !iso) return;
  const [, y, m, d] = iso ?? ["", us![3], us![1], us![2]];
  const month = Number(m);
  const day = Number(d);
  const year = y.length === 4 ? Number(y) : Number(y) + (Number(y) >= 70 ? 1900 : 2000);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day)
    return releaseFormat.format(date);
}

function labelDuplicates(visible: Track[], dates: Map<string, string | undefined>, labels: Map<string, string>) {
  for (const track of visible) {
    const peers = visible.filter(
      (other) =>
        nameKey(other.title) === nameKey(track.title) && nameKey(other.artist ?? "") === nameKey(track.artist ?? ""),
    );
    if (peers.length < 2) continue;
    const date = dates.get(track.id);
    const label = labels.get(track.id);
    const others = peers.filter((other) => other.id !== track.id);
    if (date && others.every((other) => dates.get(other.id) !== date)) track.releaseDetail = date;
    else if (label && others.every((other) => labels.get(other.id) !== label)) track.releaseDetail = label;
    else track.releaseDetail = "ID " + track.id;
  }
}

function words(text: string) {
  return nameKey(text)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function creditsKey(text: string) {
  return text.split(/[,•]/).map(words).filter(Boolean).sort().join("|");
}

function sameMix(track: Track, entry: ChartEntry) {
  return (
    !track.urlTitle &&
    !!track.artist &&
    words(track.title) === words(entry.title) &&
    creditsKey(track.artist) === creditsKey(entry.credits)
  );
}

function repeatedChartMix(entry: ChartEntry, chart: ChartEntry[]) {
  return chart.some(
    (other) =>
      other.rank !== entry.rank &&
      words(other.title) === words(entry.title) &&
      creditsKey(other.credits) === creditsKey(entry.credits),
  );
}

const versionEnding = /\b(?:mix|remix|edit|dub|version|extended)\s*\)?$/i;

function queryCredits(track: Track) {
  if (!track.artist || track.urlTitle) return [];
  return [track.artist, ...track.artist.split(/[,•]/)].map(words).filter(Boolean);
}

function versionBeforeCredit(track: Track, input: string) {
  return queryCredits(track).some((credit) => {
    const suffix = " " + credit;
    return input.endsWith(suffix) && versionEnding.test(input.slice(0, -suffix.length));
  });
}

function matchesMixQuery(track: Track, input: string) {
  if (!track.artist || track.urlTitle) return false;
  const title = words(track.title);
  if (title === input) return true;
  // The indexed title supplies the boundary between the song and its version.
  const version = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(track.title);
  return queryCredits(track).some((artist) => {
    return (
      input === artist + " " + title ||
      input === title + " " + artist ||
      (!!version &&
        versionEnding.test(version[2]) &&
        input === [words(version[1]), artist, words(version[2])].join(" "))
    );
  });
}

export function parseResults(hits: Hit[], query: string, wanted?: ChartEntry, chartHits: Hit[] = []): Results {
  const visibleIds = new Set<string>();
  const tracks = new Map<string, Track>();
  const trackImages = new Map<string, string>();
  const dates = new Map<string, string | undefined>();
  const labels = new Map<string, string>();
  const artists = new Map<string, ArtistChoice>();
  for (const [index, hit] of [...hits, ...chartHits].entries()) {
    if (!URL.canParse(hit.url)) continue;
    const page = new URL(hit.url);
    if (!["https://beatport.com", "https://www.beatport.com"].includes(page.origin) || page.username || page.password)
      continue;
    const path = /^\/(?:[a-z]{2}\/)?(track|artist)\/([^/]+)\/([1-9]\d*)\/?$/.exec(page.pathname);
    if (!path) continue;
    const [, kind, slug, id] = path;
    const url = `https://www.beatport.com/${kind}/${slug}/${id}`;

    if (kind === "artist") {
      if (index >= hits.length) continue;
      const title =
        hit.text?.match(/^# ([^\r\n]+)$/m)?.[1]?.trim() ??
        hit.title.replace(/\s+Music (?:& Downloads on Beatport|downloads?.*)$/i, "").trim();
      if (nameKey(title) !== nameKey(query)) continue;
      const artist: ArtistChoice = artists.get(id) ?? { id, title, url, chart: [] };
      artist.thumbnailUrl ??= thumbnailUrl(hit.image);
      const entries = topTen(hit.text ?? "", title);
      if (entries.length > artist.chart.length) artist.chart = entries;
      artists.set(id, artist);
      continue;
    }

    const image = thumbnailUrl(hit.image);
    if (image && !trackImages.has(id)) trackImages.set(id, image);
    if (index < hits.length) visibleIds.add(id);
    // Exa may truncate its title even when the indexed page still has the full header.
    const header = hit.text?.split(/\r?\n/, 1)[0];
    const sourceTitle = header?.includes(" - ") && /\|[^|]*Beatport\s*$/i.test(header) ? header : hit.title;
    const pageTitle = sourceTitle.replace(/\s*\|[^|]*Beatport\s*$/i, "").trim();
    const label = pageTitle.match(/\s+\[([^\]]+)\]$/)?.[1];
    const name = pageTitle.replace(/\s+\[[^\]]+\]$/, "").trim();
    const placeholder = !name || /^Unknown Artist - Unknown(?: \(Unknown Mix\))?$/i.test(name);
    const existing = tracks.get(id);
    if (existing && !existing.urlTitle) {
      const previous = [existing.artist, existing.title].filter(Boolean).join(" - ");
      const clipped = /(?:…|\.{3,})$/.exec(previous);
      if (!clipped || placeholder || /(?:…|\.{3,})$/.test(name)) continue;
      const prefix = nameKey(previous.slice(0, clipped.index));
      if (!prefix || !nameKey(name).startsWith(prefix)) continue;
    }
    if (placeholder) {
      if (!existing && slug.length > 2 && /[a-z]{2}/i.test(slug))
        tracks.set(id, { id, url, title: slug.replace(/-/g, " "), urlTitle: true });
      continue;
    }
    const split = name.indexOf(" - ");
    const hasArtist = split > 0 && split + 3 < name.length;
    dates.set(id, releaseDate(hit.text));
    if (label && !/^unknown label$/i.test(label)) labels.set(id, label);
    tracks.set(id, {
      id,
      url,
      title: hasArtist ? name.slice(split + 3) : name,
      artist: hasArtist ? name.slice(0, split) : undefined,
    });
  }
  const profiles = [...artists.values()];
  const profile = profiles.length === 1 ? profiles[0] : undefined;
  const chart = profile?.chart ?? [];
  const matches = [...tracks.values()].filter((track) => !profiles.length || creditedTo(track.artist ?? "", query));
  for (const track of matches) track.thumbnailUrl = trackImages.get(track.id);
  const linked = new Set<string>();
  for (const entry of chart) {
    if (repeatedChartMix(entry, chart)) continue;
    const candidates = matches.filter((track) => sameMix(track, entry));
    if (candidates.length === 1) {
      entry.trackUrl = candidates[0].url;
      entry.thumbnailUrl = candidates[0].thumbnailUrl;
      linked.add(candidates[0].id);
    }
  }
  const input = words(query);
  const mixSearch =
    !profiles.length &&
    (!!wanted ||
      versionEnding.test(query) ||
      /\([^()]*\b(?:mix|remix|edit|dub|version|extended)\)\s+\S/i.test(query) ||
      matches.some(
        (track) =>
          versionBeforeCredit(track, input) || (versionEnding.test(track.title) && matchesMixQuery(track, input)),
      ));
  if (mixSearch) {
    for (const track of matches) {
      if (track.urlTitle) {
        const hint = words(track.title);
        if (hint && (" " + input + " ").includes(" " + hint + " ")) track.match = "url";
      } else if (wanted ? sameMix(track, wanted) : matchesMixQuery(track, input)) {
        track.match = "exact";
      }
    }
    const weight = (track: Track) => (track.match === "exact" ? 2 : track.match === "url" ? 1 : 0);
    matches.sort((a, b) => weight(b) - weight(a));
  }
  const visible = matches.filter((track) => visibleIds.has(track.id) && !linked.has(track.id)).slice(0, 10);
  labelDuplicates(visible, dates, labels);
  return {
    profile,
    ...(profiles.length > 1 && { artistChoices: profiles }),
    chart,
    tracks: visible,
    ...(mixSearch && { mixSearch: true }),
  };
}

function isHit(value: unknown): value is Hit {
  return (
    typeof value === "object" &&
    value !== null &&
    "url" in value &&
    typeof value.url === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    (!("text" in value) || value.text == null || typeof value.text === "string")
  );
}

export async function searchBeatport(
  query: string,
  signal: AbortSignal,
  wanted?: ChartEntry,
  onInitial?: (initial: Results) => void,
): Promise<Results> {
  const client = new Client({ name: "beatport-search-raycast", version: "0.2.0" });
  const transport = new StreamableHTTPClientTransport(new URL("https://mcp.exa.ai/mcp?tools=web_search_advanced_exa"));
  const options = { signal, timeout: 15000 };
  async function lookup(text: string, type: "lite" | "auto", domains: string[], count: number): Promise<Hit[]> {
    signal.throwIfAborted();
    const response = await client.callTool(
      {
        name: "web_search_advanced_exa",
        arguments: {
          query: text,
          type,
          includeDomains: domains,
          numResults: count,
          textMaxCharacters: type === "auto" ? 20000 : 12000,
        },
      },
      undefined,
      options,
    );
    if (!Array.isArray(response.content)) throw new Error("Exa returned an unexpected response.");
    const payload = response.content.find((item) => item.type === "text")?.text;
    if (response.isError || typeof payload !== "string")
      throw new Error(/rate.limit|429/i.test(payload ?? "") ? "Exa rate limit" : "Exa search failed");
    const data = JSON.parse(payload);
    if (data && !("results" in data) && typeof data.requestId === "string" && typeof data.searchTime === "number")
      return [];
    if (!Array.isArray(data?.results)) throw new Error("Exa returned an unexpected response.");
    return data.results.filter(isHit);
  }

  try {
    await client.connect(transport, options);
    const hits = await lookup(query, "lite", ["beatport.com/artist", "beatport.com/track"], 18);
    let result = parseResults(hits, query, wanted);
    let previewSent = false;
    function publishPreview() {
      if (previewSent || signal.aborted || !(result.profile || result.tracks.length)) return;
      previewSent = true;
      onInitial?.(result);
    }
    // Supplemental lookups can fail independently. Keep the first page usable.
    try {
      if (result.mixSearch && !result.tracks.some((track) => track.match === "exact")) {
        const focused =
          query
            .replace(/[()]/g, " ")
            .replace(/\boriginal mix\s*$/i, "")
            .replace(/\s+/g, " ")
            .trim() || query;
        const credit =
          wanted?.credits ??
          result.tracks
            .map((track) => track.artist)
            .filter((artist): artist is string => !!artist && nameKey(focused).startsWith(nameKey(artist) + " "))
            .sort((a, b) => b.length - a.length)[0];
        const title = wanted?.title ?? (credit ? focused.slice(credit.length).trim() : "");
        const slug = words(title.replace(/\s+original mix$/i, "")).replace(/ /g, "-");
        const domains =
          slug && /\(original mix\)\s*$/i.test(query) ? ["beatport.com/track/" + slug] : ["beatport.com/track"];
        publishPreview();
        const extra = await lookup(focused, "auto", domains, 8);
        return parseResults([...extra, ...hits], query, wanted);
      }
      if (
        !result.artistChoices &&
        !result.chart.length &&
        (result.profile || result.tracks.some((track) => creditedTo(track.artist ?? "", query)))
      ) {
        publishPreview();
        hits.push(...(await lookup('"' + query + '" Beatport artist', "auto", ["beatport.com/artist"], 12)));
        result = parseResults(hits, query, wanted);
      }
      const unresolved = result.chart
        .filter((entry) => !entry.trackUrl && !repeatedChartMix(entry, result.chart))
        .slice(0, 3);
      if (unresolved.length) {
        publishPreview();
        // Only chart links may change here. Keep the original search's tracks and ordering.
        const extras = await Promise.allSettled(
          unresolved.map((entry) =>
            lookup(
              entry.credits + " " + entry.title.replace(/\s+Original Mix$/i, ""),
              "auto",
              ["beatport.com/track"],
              8,
            ),
          ),
        );
        signal.throwIfAborted();
        const candidates = extras.flatMap((extra) => (extra.status === "fulfilled" ? extra.value : []));
        result = parseResults(hits, query, wanted, candidates);
      }
    } catch {
      signal.throwIfAborted();
    }
    return result;
  } finally {
    await client.close();
  }
}
