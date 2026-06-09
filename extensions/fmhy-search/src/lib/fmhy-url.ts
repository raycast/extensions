export const FMHY_BASE_URL = "https://fmhy.net";

const WIKI_PAGE_ROUTE_ALIASES = new Map<string, string>([
  ["adblocking", "privacy"],
  ["android", "mobile"],
  ["dev-tools", "developer-tools"],
  ["edu", "educational"],
  ["game-tools", "gaming-tools"],
  ["linux", "linux-macos"],
  ["non-eng", "non-english"],
  ["social-media", "social-media-tools"],
  ["torrent", "torrenting"],
]);

const TOP_LEVEL_PAGE_STARTS = new Map<string, string>([
  ["adblocking", "privacy"],
  ["ai-chatbots", "ai"],
  ["android-apks", "mobile"],
  ["arabic", "non-english"],
  ["audio-streaming", "audio"],
  ["dev-communities", "developer-tools"],
  ["documentaries", "educational"],
  ["download-directories", "downloading"],
  ["download-games", "gaming"],
  ["ebooks", "reading"],
  ["file-tools", "file-tools"],
  ["gaming-tools", "gaming-tools"],
  ["image-editing", "image-tools"],
  ["indexes", "misc"],
  ["internet-tools", "internet-tools"],
  ["linux-guides", "linux-macos"],
  ["social-media-tools", "social-media-tools"],
  ["system-tools", "system-tools"],
  ["text-tools", "text-tools"],
  ["video-tools", "video-tools"],
]);

const GENERATED_CATEGORY_ROUTE_ALIASES = new Map<string, string>([
  ...routeAliases("ai", [
    "ai-benchmarks",
    "ai-indexes",
    "ai-tools",
    "ai-writing-tools",
    "audio-generation",
    "image-generation",
    "machine-learning",
    "video-generation",
  ]),
  ...routeAliases("audio", [
    "audio-editing",
    "audio-ripping",
    "audio-tools",
    "audio-torrenting",
    "media-soundtracks",
    "radio-streaming",
    "royalty-free-music",
    "spotify-tools",
  ]),
  ...routeAliases("developer-tools", [
    "cybersecurity-tools",
    "developer-learning",
    "developer-tools",
    "dev-news",
    "game-dev-tools",
    "hosting-tools",
    "ides-code-editors",
    "programming-languages",
    "web-development",
    "web-dev-tools",
  ]),
  ...routeAliases("downloading", ["debrid-leeches", "download-directories", "software-sites", "usenet"]),
  ...routeAliases("educational", [
    "courses",
    "documentaries",
    "educational-tools",
    "exam-prep",
    "history",
    "humanities",
    "language-learning",
    "learning-sites",
    "science-math",
    "skills-hobbies-diy",
    "space",
  ]),
  ...routeAliases("file-tools", ["file-hosts", "file-tools", "file-transfer", "pdf-tools"]),
  ...routeAliases("gaming", ["browser-games", "download-games", "emulation-roms", "puzzle-games", "tabletop-games"]),
  ...routeAliases("gaming-tools", [
    "game-specific",
    "gaming-tools",
    "genre-specific",
    "homebrew",
    "minecraft-tools",
    "multiplayer-tools",
    "steam-epic",
  ]),
  ...routeAliases("image-tools", [
    "3d-models",
    "design-resources-ideas",
    "download-images",
    "image-creation",
    "image-editing",
    "image-tools",
    "photography-cameras",
  ]),
  ...routeAliases("internet-tools", [
    "archiving",
    "browser-bookmarks",
    "browser-startpages",
    "browser-tools",
    "email-tools",
    "internet-tools",
    "open-source-intelligence",
    "rss-tools",
    "search-tools",
    "url-tools",
  ]),
  ...routeAliases("linux-macos", [
    "linux-apps",
    "linux-communities",
    "linux-distros",
    "linux-guides",
    "linux-tools",
    "mac-apps",
    "mac-tools",
    "unix-like",
  ]),
  ...routeAliases("misc", [
    "career",
    "food",
    "free-stuff",
    "fun-sites",
    "gardening",
    "health",
    "household",
    "indexes",
    "maps",
    "news",
    "shopping",
    "travel",
    "useful-sites",
    "vehicle",
  ]),
  ...routeAliases("mobile", [
    "android-apks",
    "android-audio",
    "android-camera",
    "android-device",
    "android-reading",
    "android-streaming",
    "android-tools",
    "android-torrenting",
    "emulators",
    "ios-audio",
    "ios-ipas",
    "ios-reading",
    "ios-streaming",
    "ios-tools",
  ]),
  ...routeAliases("privacy", [
    "adblocking",
    "antivirus-anti-malware",
    "privacy-security",
    "proxy",
    "vpn",
    "web-privacy",
  ]),
  ...routeAliases("reading", [
    "audiobooks",
    "documents-articles",
    "ebooks",
    "educational-books",
    "esoteric-cultural",
    "visual-media",
  ]),
  ...routeAliases("social-media-tools", [
    "4chan-tools",
    "bilibili-tools",
    "blogging-tools",
    "discord-tools",
    "facebook-tools",
    "fediverse-tools",
    "instagram-tools",
    "reddit-tools",
    "social-media-tools",
    "telegram-tools",
    "tumblr-tools",
    "twitch-tools",
    "twitter-x-tools",
    "youtube-tools",
  ]),
  ...routeAliases("system-tools", ["hardware-tools", "system-tools", "windows-isos"]),
  ...routeAliases("text-tools", ["font-tools", "fonts", "markup-tools", "text-editors", "text-tools"]),
  ...routeAliases("torrenting", ["private-trackers", "torrent-clients", "torrent-sites"]),
  ...routeAliases("video", ["live-tv-sports", "smart-tv", "streaming-sites", "torrent-apps"]),
  ...routeAliases("video-tools", [
    "media-servers",
    "subtitle-tools",
    "video-download",
    "video-editing",
    "video-players",
    "video-tools",
  ]),
]);

export function getFmhyPageRouteForTopLevelHeading(
  title: string,
  currentPageRoute: string | undefined,
): string | undefined {
  const slug = slugifyFmhyText(title);

  if (slug === "streaming-sites" && currentPageRoute === "video-tools") {
    return "video";
  }

  if (slug === "torrent-sites" && currentPageRoute !== "video") {
    return "torrenting";
  }

  return TOP_LEVEL_PAGE_STARTS.get(slug);
}

export function getFmhyRouteFromWikiPage(page: string): string {
  const normalizedPage = page.toLocaleLowerCase();
  return WIKI_PAGE_ROUTE_ALIASES.get(normalizedPage) ?? normalizedPage;
}

export function getFmhyPageUrl(pageRoute: string, anchor?: string): string {
  const baseUrl = `${FMHY_BASE_URL}/${pageRoute}`;
  return anchor ? `${baseUrl}#${anchor}` : baseUrl;
}

export function getFmhySectionUrl(pageRoute: string, headingTitle: string): string {
  const anchor = slugifyFmhyText(headingTitle);
  return getFmhyPageUrl(pageRoute, anchor && anchor !== pageRoute ? anchor : undefined);
}

export function normalizeFmhyGeneratedCategoryUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLocaleLowerCase() !== "fmhy.net" || parsed.search) {
      return url;
    }

    const slug = parsed.pathname.split("/").filter(Boolean).join("/");
    if (!slug || slug.includes("/")) {
      return url;
    }

    const hash = parsed.hash.replace(/^#/, "") || undefined;
    const generatedRoute = GENERATED_CATEGORY_ROUTE_ALIASES.get(slug) ?? TOP_LEVEL_PAGE_STARTS.get(slug);
    if (generatedRoute) {
      return getFmhyPageUrl(generatedRoute, hash ?? (generatedRoute === slug ? undefined : slug));
    }

    const wikiRoute = WIKI_PAGE_ROUTE_ALIASES.get(slug);
    if (wikiRoute) {
      return getFmhyPageUrl(wikiRoute, hash);
    }

    return url;
  } catch {
    return url;
  }
}

export function getFmhyUrlFromRedditWiki(parsed: URL): string | undefined {
  if (!parsed.hostname.toLowerCase().endsWith("reddit.com")) {
    return undefined;
  }

  const match = /^\/r\/FREEMEDIAHECKYEAH\/wiki\/([^/#?]+)/i.exec(parsed.pathname);
  if (!match?.[1]) {
    return undefined;
  }

  const page = decodeURIComponent(match[1]).toLocaleLowerCase();
  const anchor = getFmhyAnchorFromRedditHash(parsed.hash);

  return getFmhyPageUrl(getFmhyRouteFromWikiPage(page), anchor);
}

export function slugifyFmhyText(text: string): string {
  return text
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getFmhyAnchorFromRedditHash(hash: string): string | undefined {
  if (!hash) {
    return undefined;
  }

  const cleaned = hash
    .replace(/^#?wiki_?/i, "")
    .replace(/^(?:\.[0-9a-f]{2,6})+_?/i, "")
    .replace(/\.[0-9a-f]{2,6}/gi, "-")
    .replace(/^_+/, "")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return cleaned || undefined;
}

function routeAliases(route: string, slugs: string[]): Array<[string, string]> {
  return slugs.map((slug) => [slug, route]);
}
