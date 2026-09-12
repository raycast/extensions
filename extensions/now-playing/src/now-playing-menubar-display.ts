export type MenuBarDisplayMode =
  | "track-artist"
  | "track-only"
  | "artist-only"
  | "track-album"
  | "artwork-only"
  | "custom";

export type MenuBarState = {
  track: string;
  artist: string;
  album: string;
  artworkUrl: string;
  status: "ok" | "no-track" | "missing-media-control" | "unsupported-platform" | "error";
};

const DEFAULT_TITLE_TEMPLATE = "{track} — {artist}";

function assertUnreachable(value: never): never {
  throw new Error(`Unhandled menu bar display mode: ${String(value)}`);
}

export function normalizeTemplate(template?: string): string {
  const trimmed = (template || "").trim();
  return trimmed || DEFAULT_TITLE_TEMPLATE;
}

export function resolveMenuBarTemplate(mode: MenuBarDisplayMode, customTemplate?: string): string {
  switch (mode) {
    case "track-only":
      return "{track}";
    case "artist-only":
      return "{artist}";
    case "track-album":
      return "{track} — {album}";
    case "artwork-only":
      return "";
    case "custom":
      return normalizeTemplate(customTemplate);
    case "track-artist":
      return DEFAULT_TITLE_TEMPLATE;
  }

  return assertUnreachable(mode);
}

export function shouldShowMenuBarArtwork(mode: MenuBarDisplayMode, showAlbumArtwork: boolean): boolean {
  switch (mode) {
    case "track-only":
    case "artist-only":
    case "track-album":
      return false;
    case "track-artist":
    case "custom":
      return showAlbumArtwork;
    case "artwork-only":
      return true;
  }

  return assertUnreachable(mode);
}

export function menuTitle(state: MenuBarState, mode: MenuBarDisplayMode, customTemplate?: string): string {
  if (state.status === "missing-media-control") {
    return "Install media-control";
  }

  if (state.status !== "ok" || !state.track) {
    return "♫";
  }

  if (mode === "artwork-only") {
    return state.artworkUrl ? "" : "♫";
  }

  const values: Record<string, string> = {
    track: state.track,
    artist: state.artist,
    album: state.album,
  };

  const rendered = resolveMenuBarTemplate(mode, customTemplate).replace(/\{([^}]+)\}/g, (_, token: string) => {
    return values[token.toLowerCase()] || "";
  });

  const cleaned = rendered
    .replace(/\s+/g, " ")
    .replace(/\s*([—–|:-])\s*/g, " $1 ")
    .replace(/^[\s—–|:-]+|[\s—–|:-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || state.track;
}
