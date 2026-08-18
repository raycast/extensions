import { open } from "@raycast/api";

export type ToolboxContextType = "artist" | "album" | "track";

export interface ToolboxContext {
  type: ToolboxContextType;
  artist: string;
  albumArtist: string;
  album: string;
  track: string;
  genre: string;
  year: number;
  path: string;
}

// Service and prompt model adapted from Last.fm: Toolbox v6 (MIT),
// authored by deathrashed; reimplemented here for native Swinsian context.

export type ToolboxCategory = "databases" | "streaming" | "lyrics" | "covers" | "social" | "utilities" | "lastfm";

export interface ToolboxService {
  id: string;
  title: string;
  category: ToolboxCategory;
  icon?: string;
  url: (context: ToolboxContext, username: string) => string;
  supports?: ToolboxContextType[];
}

const q = (value: string) => encodeURIComponent(value);
const query = (context: ToolboxContext) =>
  context.type === "track"
    ? [context.track, context.artist].filter(Boolean).join(" ")
    : context.type === "album"
      ? [context.album, context.artist].filter(Boolean).join(" ")
      : context.artist;
export const TOOLBOX_CATEGORY_LABELS: Record<ToolboxCategory, string> = {
  databases: "Databases",
  streaming: "Streaming",
  lyrics: "Lyrics",
  covers: "Covers",
  social: "Social",
  utilities: "Utilities",
  lastfm: "Last.fm Tools",
};

export const TOOLBOX_SERVICES: ToolboxService[] = [
  {
    id: "google",
    title: "Google",
    category: "databases",
    icon: "google.png",
    url: (c) => `https://www.google.com/search?q=${q(`${query(c)} ${c.type}`)}`,
  },
  {
    id: "aoty",
    title: "Album of the Year",
    category: "databases",
    icon: "album-of-the-year.png",
    supports: ["artist", "album"],
    url: (c) =>
      c.type === "artist"
        ? `https://www.albumoftheyear.org/search/?q=${q(c.artist)}`
        : `https://www.albumoftheyear.org/search/albums/?q=${q(c.album || c.track)}`,
  },
  {
    id: "audiodb",
    title: "TheAudioDB",
    category: "databases",
    icon: "audiodb.png",
    supports: ["artist"],
    url: (c) => `https://www.theaudiodb.com/search.php?search=${q(c.artist)}`,
  },
  {
    id: "metallum",
    title: "Metal Archives",
    category: "databases",
    icon: "metallum.png",
    url: (c) =>
      c.type === "track"
        ? `https://www.metal-archives.com/search?searchString=${q(c.track)}&type=song_title`
        : c.type === "album"
          ? `https://www.metal-archives.com/search?searchString=${q(c.album)}&type=album_title`
          : `https://www.metal-archives.com/search?searchString=${q(c.artist)}&type=band_name`,
  },
  {
    id: "rym",
    title: "Rate Your Music",
    category: "databases",
    icon: "rateyourmusic.png",
    supports: ["artist", "album"],
    url: (c) =>
      `https://rateyourmusic.com/search?searchtype=${c.type === "artist" ? "a" : "l"}&searchterm=${q(query(c))}`,
  },
  {
    id: "discogs",
    title: "Discogs",
    category: "databases",
    icon: "discogs-2.png",
    supports: ["artist", "album"],
    url: (c) => `https://www.discogs.com/search/?q=${q(query(c))}&type=${c.type === "artist" ? "artist" : "release"}`,
  },
  {
    id: "musicbrainz",
    title: "MusicBrainz",
    category: "databases",
    icon: "musicbrainz-picard.png",
    url: (c) =>
      `https://musicbrainz.org/search?query=${q(query(c))}&type=${c.type === "artist" ? "artist" : c.type === "album" ? "release" : "recording"}`,
  },
  {
    id: "wikipedia",
    title: "Wikipedia",
    category: "databases",
    icon: "wikipedia.png",
    url: (c) => `https://en.wikipedia.org/w/index.php?search=${q(query(c))}`,
  },
  {
    id: "allmusic",
    title: "AllMusic",
    category: "databases",
    icon: "allmusic.png",
    url: (c) => `https://www.allmusic.com/search/all/${q(query(c))}`,
  },
  {
    id: "listenbrainz",
    title: "ListenBrainz",
    category: "databases",
    icon: "listenbrainz.png",
    url: (c) => `https://listenbrainz.org/search/?search_term=${q(query(c))}&search_type=${c.type}`,
  },
  {
    id: "everynoise",
    title: "Every Noise at Once",
    category: "databases",
    icon: "everynoiseatonce.png",
    url: (c) =>
      `https://everynoise.com/research.html?mode=${c.type === "artist" ? "name" : c.type}&name=${q(c.track || c.album || c.artist)}`,
  },
  ...[
    ["spotify", "Spotify", "spotify.png", (c: ToolboxContext) => `https://open.spotify.com/search/${q(query(c))}`],
    [
      "youtube",
      "YouTube",
      "youtube.png",
      (c: ToolboxContext) => `https://www.youtube.com/results?search_query=${q(query(c))}`,
    ],
    [
      "youtube-music",
      "YouTube Music",
      "youtube-music.png",
      (c: ToolboxContext) => `https://music.youtube.com/search?q=${q(query(c))}`,
    ],
    [
      "apple-music",
      "Apple Music",
      "itunes.png",
      (c: ToolboxContext) => `https://music.apple.com/au/search?term=${q(query(c))}`,
    ],
    ["bandcamp", "Bandcamp", "bandcamp.png", (c: ToolboxContext) => `https://bandcamp.com/search?q=${q(query(c))}`],
    [
      "soundcloud",
      "SoundCloud",
      "soundcloud.png",
      (c: ToolboxContext) => `https://soundcloud.com/search?q=${q(query(c))}`,
    ],
    ["deezer", "Deezer", "deezer.png", (c: ToolboxContext) => `https://www.deezer.com/search/${q(query(c))}`],
    ["tidal", "Tidal", "tidal.png", (c: ToolboxContext) => `https://tidal.com/search?q=${q(query(c))}`],
    ["amazon", "Amazon Music", "amazon.png", (c: ToolboxContext) => `https://music.amazon.com/search?k=${q(query(c))}`],
    ["qobuz", "Qobuz", "qobuz.png", (c: ToolboxContext) => `https://www.qobuz.com/au-en/search?q=${q(query(c))}`],
    ["audiomack", "Audiomack", "audiomack.png", (c: ToolboxContext) => `https://audiomack.com/search?q=${q(query(c))}`],
    [
      "monochrome",
      "Monochrome",
      "monochrome.png",
      (c: ToolboxContext) => `https://monochrome.tf/search/${q(query(c))}`,
    ],
  ].map(([id, title, icon, url]) => ({ id, title, icon, url, category: "streaming" as const }) as ToolboxService),
  ...[
    ["genius", "Genius", "genius.png", (c: ToolboxContext) => `https://genius.com/search?q=${q(query(c))}`],
    [
      "darklyrics",
      "Dark Lyrics",
      "darklyrics.png",
      (c: ToolboxContext) => `http://www.darklyrics.com/search?q=${q(query(c))}`,
    ],
    [
      "google-lyrics",
      "Google Lyrics",
      "google.png",
      (c: ToolboxContext) => `https://www.google.com/search?q=${q(`${query(c)} lyrics`)}`,
    ],
    [
      "musixmatch",
      "Musixmatch",
      "musixmatch.png",
      (c: ToolboxContext) => `https://www.musixmatch.com/search/${q(query(c))}`,
    ],
  ].map(
    ([id, title, icon, url]) =>
      ({ id, title, icon, url, category: "lyrics" as const, supports: ["track"] }) as ToolboxService,
  ),
  ...[
    [
      "cov",
      "COV – MusicHoarders",
      "cov.png",
      (c: ToolboxContext) => `https://covers.musichoarders.xyz/?artist=${q(c.artist)}&album=${q(c.album)}`,
    ],
    [
      "google-images",
      "Google Images",
      "google-images.png",
      (c: ToolboxContext) => `https://www.google.com/search?udm=2&q=${q(query(c))}`,
    ],
    [
      "yahoo-images",
      "Yahoo Images",
      "yahoo.png",
      (c: ToolboxContext) => `https://images.search.yahoo.com/search/images?p=${q(query(c))}`,
    ],
    [
      "bing-images",
      "Bing Images",
      "bing.png",
      (c: ToolboxContext) => `https://www.bing.com/images/search?q=${q(query(c))}`,
    ],
    [
      "fanart",
      "Fanart.tv",
      "fanart.png",
      (c: ToolboxContext) => `https://fanart.tv/add-entry/?tab=music&search=${q(query(c))}#music`,
    ],
  ].map(
    ([id, title, icon, url]) =>
      ({ id, title, icon, url, category: "covers" as const, supports: ["artist", "album"] }) as ToolboxService,
  ),
  ...[
    [
      "instagram",
      "Instagram",
      "instagram.png",
      (c: ToolboxContext) => `https://www.instagram.com/explore/search/keyword/?q=${q(c.artist)}`,
    ],
    [
      "facebook",
      "Facebook",
      "facebook.png",
      (c: ToolboxContext) => `https://www.facebook.com/search/top?q=${q(query(c))}`,
    ],
    ["reddit", "Reddit", undefined, (c: ToolboxContext) => `https://www.reddit.com/search/?q=${q(query(c))}`],
    [
      "twitter",
      "X (Twitter)",
      "twitter.png",
      (c: ToolboxContext) => `https://x.com/search?q=${q(query(c))}&src=typed_query`,
    ],
  ].map(
    ([id, title, icon, url]) =>
      ({ id, title, icon, url, category: "social" as const, supports: ["artist"] }) as ToolboxService,
  ),
  ...[
    [
      "chosic",
      "Chosic",
      "chosic.png",
      (c: ToolboxContext) => `https://www.chosic.com/search-results/?q=${q(query(c))}`,
    ],
    [
      "spirit-of-metal",
      "Spirit of Metal",
      "spiritofmetal.png",
      (c: ToolboxContext) => `https://www.spirit-of-metal.com/liste_groupe.php?recherche_groupe=${q(c.artist)}`,
    ],
    [
      "metalstorm",
      "Metal Storm",
      "metalstorm.png",
      (c: ToolboxContext) => `https://metalstorm.net/bands/index.php?b_where=b.bandname&b_what=${q(c.artist)}`,
    ],
    [
      "lucida",
      "Lucida",
      "lucida.png",
      (c: ToolboxContext) => `https://lucida.to/search?query=${q(query(c))}&service=qobuz`,
    ],
    [
      "sputnik",
      "Sputnikmusic",
      "sputnik.png",
      (c: ToolboxContext) => `https://www.sputnikmusic.com/search_results.php?search_text=${q(query(c))}`,
    ],
    [
      "internet-archive",
      "Internet Archive",
      "internetarchive.png",
      (c: ToolboxContext) => `https://archive.org/details/audio?tab=collection&query=${q(query(c))}`,
    ],
    [
      "whosampled",
      "WhoSampled",
      "whosmapled.png",
      (c: ToolboxContext) => `https://www.whosampled.com/search/?q=${q(query(c))}`,
    ],
    ["musicmap", "MusicMap", undefined, () => "https://musicmap.info/"],
  ].map(([id, title, icon, url]) => ({ id, title, icon, url, category: "utilities" as const }) as ToolboxService),
  ...[
    ["lastfm-stats", "Last.fm Stats", (u: string) => `https://lastfmstats.com/user/${q(u)}/general`],
    ["lastfm-live", "Live Dashboard", (u: string) => `https://lastfm.live/${q(u)}`],
    ["explr", "Explr.fm", (u: string) => `https://mold.github.io/explr/?username=${q(u)}`],
    [
      "tapmusic",
      "TapMusic Collage",
      (u: string) =>
        `https://www.tapmusic.net/collage.php?user=${q(u)}&type=3month&size=5x5&caption=true&playcount=true`,
    ],
    ["time-capsule", "Time Capsule", (u: string) => `https://bxh9261.github.io/last-fm-time-capsule/?username=${q(u)}`],
    ["manual-scrobbler", "Manual Scrobbler", () => "https://www.bijou.fm/manual-scrobbler"],
  ].map(
    ([id, title, makeUrl]) =>
      ({
        id,
        title,
        category: "lastfm" as const,
        icon: "lastfm.png",
        url: (_c: ToolboxContext, username: string) => (makeUrl as (u: string) => string)(username),
      }) as ToolboxService,
  ),
];

export function parseCustomServices(raw: string): ToolboxService[] {
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw) as Array<{ id?: string; title: string; url: string; icon?: string }>;
  return parsed.map((service, index) => ({
    id: service.id || `custom-${index}`,
    title: service.title,
    category: "utilities",
    icon: service.icon,
    url: (context) =>
      service.url
        .replaceAll("{artist}", q(context.artist))
        .replaceAll("{album}", q(context.album))
        .replaceAll("{track}", q(context.track))
        .replaceAll("{query}", q(query(context)))
        .replaceAll("{type}", context.type),
  }));
}

export async function openToolboxServiceForContext(
  service: ToolboxService,
  context: ToolboxContext,
  username: string,
): Promise<void> {
  if (service.category === "lastfm" && !username.trim() && !["manual-scrobbler"].includes(service.id)) {
    throw new Error("Add your Last.fm username in the Menu Bar Player preferences first.");
  }
  await open(service.url(context, username));
}
