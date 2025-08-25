import { Platform } from "../types";

/**
 * List of supported music streaming platforms
 * These platforms can be both input sources and output targets
 */
export const MUSIC_PLATFORMS: Platform[] = [
  {
    id: "spotify",
    name: "Spotify",
    urlPatterns: [
      /^https?:\/\/(open\.)?spotify\.com\/(track|album|artist|playlist)\/[\w]+/i,
      /^spotify:(track|album|artist|playlist):[\w]+/i,
    ],
    icon: "https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg", // Changed to .png
  },
  {
    id: "apple-music",
    name: "Apple Music",
    urlPatterns: [
      /^https?:\/\/music\.apple\.com\/[\w]{2}\/(album|playlist|artist)\/[\w-]+\/[\w]+/i,
      /^https?:\/\/music\.apple\.com\/[\w]{2}\/(album|playlist|artist)\/[\w-]+\/[\w]+\?i=[\w]+/i,
      /^https?:\/\/geo\.music\.apple\.com\/[\w]{2}\/(album|playlist|artist)\/[\w-]*\/[\w]+/i,
      /^https?:\/\/geo\.music\.apple\.com\/[\w]{2}\/(album|playlist|artist)\/[\w-]*\/[\w]+\?[^]*/i,
    ],
    icon: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Apple_Music_icon.svg",
  },
  {
    id: "youtube",
    name: "YouTube",
    urlPatterns: [/^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i, /^https?:\/\/youtu\.be\/[\w-]+/i],
    icon: "https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg",
  },
  {
    id: "youtube-music",
    name: "YouTube Music",
    urlPatterns: [
      /^https?:\/\/music\.youtube\.com\/watch\?v=[\w-]+/i,
      /^https?:\/\/music\.youtube\.com\/(playlist|channel|browse)\/[\w-]+/i,
    ],
    icon: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Youtube_Music_icon.svg",
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    urlPatterns: [
      /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/i,
      /^https?:\/\/(www\.)?soundcloud\.com\/[\w-]+\/sets\/[\w-]+/i,
    ],
    icon: "https://www.vectorlogo.zone/logos/soundcloud/soundcloud-tile.svg",
  },
  {
    id: "deezer",
    name: "Deezer",
    urlPatterns: [/^https?:\/\/(www\.)?deezer\.com\/[\w]{2}\/(track|album|playlist)\/[\d]+/i],
    icon: "https://static.wikia.nocookie.net/logopedia/images/e/e3/Deezer_symbol_2023.svg/revision/latest?cb=20231117160020",
  },
  {
    id: "tidal",
    name: "TIDAL",
    urlPatterns: [/^https?:\/\/(www\.|listen\.)?tidal\.com\/(browse\/)?(track|album|artist|playlist)\/[\w-]+/i],
    icon: "https://upload.wikimedia.org/wikipedia/commons/4/41/Tidal_%28service%29_logo_only.svg",
  },
  {
    id: "amazon-music",
    name: "Amazon Music",
    urlPatterns: [/^https?:\/\/music\.amazon\.[\w.]+\/(albums|tracks|playlists)\/[\w]+/i],
    icon: "https://upload.wikimedia.org/wikipedia/commons/9/92/Amazon_Music_logo.svg",
  },
  {
    id: "amazon",
    name: "Amazon.com",
    urlPatterns: [/^https?:\/\/(www\.)?amazon\.[\w.]+\/[\w-]+\/dp\/[\w]+/i],
    icon: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  },
  {
    id: "pandora",
    name: "Pandora",
    urlPatterns: [/^https?:\/\/(www\.)?pandora\.com\/(artist|station|playlist)\/[\w-]+/i],
    icon: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Pandora_wordmark.svg",
  },
  {
    id: "napster",
    name: "Napster",
    urlPatterns: [/^https?:\/\/(www\.|app\.)?napster\.com\/(artist|album|track)\/[\w-]+/i],
    icon: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Napster_logo.svg",
  },
  {
    id: "itunes",
    name: "iTunes",
    urlPatterns: [/^https?:\/\/itunes\.apple\.com\/[\w]{2}\/(album|artist)\/[\w-]+\/id[\d]+/i],
    icon: "https://upload.wikimedia.org/wikipedia/commons/d/df/ITunes_logo.svg",
  },
  {
    id: "yandex-music",
    name: "Yandex.Music",
    urlPatterns: [/^https?:\/\/music\.yandex\.(ru|com)\/(album|track|artist)\/[\d]+/i],
    icon: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Yandex_Music_icon.svg",
  },
  {
    id: "audiomack",
    name: "Audiomack",
    urlPatterns: [/^https?:\/\/(www\.)?audiomack\.com\/(song|album)\/[\w-]+\/[\w-]+/i],
    icon: "https://styleguide.audiomack.com/assets/dl/mark-alone-ffa200.svg",
  },
  {
    id: "audius",
    name: "Audius",
    urlPatterns: [/^https?:\/\/audius\.co\/[\w-]+\/[\w-]+/i],
    icon: "https://cdn.prod.website-files.com/60999ea7cc5f28e9cda637b6/671bf907143851e1c9d4e797_LogoGlyph-Color_1024%402x.webp",
  },
];

/**
 * List of supported podcast platforms
 * Only Apple Podcasts can be used as input
 */
export const PODCAST_PLATFORMS: Platform[] = [
  {
    id: "apple-podcasts",
    name: "Apple Podcasts",
    urlPatterns: [/^https?:\/\/podcasts\.apple\.com\/[\w]{2}\/podcast\/[\w-]+\/id[\d]+/i],
    icon: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Podcasts_%28iOS%29.svg",
  },
  {
    id: "google-podcasts",
    name: "Google Podcasts",
    urlPatterns: [],
    icon: "https://upload.wikimedia.org/wikipedia/commons/2/25/Google_Podcasts_icon.svg",
  },
  {
    id: "overcast",
    name: "Overcast",
    urlPatterns: [],
    icon: "https://www.svgrepo.com/show/349468/overcast.svg",
  },
  {
    id: "castbox",
    name: "Castbox",
    urlPatterns: [],
    icon: "https://www.svgrepo.com/show/330117/castbox.svg",
  },
  {
    id: "pocket-casts",
    name: "Pocket Casts",
    urlPatterns: [],
    icon: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Pocket_Casts_icon.svg",
  },
];

export const ALL_PLATFORMS = [...MUSIC_PLATFORMS, ...PODCAST_PLATFORMS];
export const PLATFORM_MAP = new Map<string, Platform>(ALL_PLATFORMS.map((platform) => [platform.id, platform]));
