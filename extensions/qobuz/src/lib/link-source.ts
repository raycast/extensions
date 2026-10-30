import { linkService, looksLikeTrackLink, type LinkService } from "./resolve";

export type LinkOrigin = "link" | "clipboard";

export type PickedLink = { url: string; origin: LinkOrigin; service: LinkService | undefined };

// A typed link always wins, even one that turns out unusable: it says what to
// convert, so a failure is reported rather than quietly converting whatever the
// clipboard holds. The clipboard only counts when it holds a track link, since
// most of the time it holds something else entirely.
export const pickLink = (argument: string, clipboard: string | undefined): PickedLink | undefined => {
  const typed = argument.trim();
  if (typed) return { url: typed, origin: "link", service: linkService(typed) };

  const copied = clipboard?.trim() ?? "";
  if (looksLikeTrackLink(copied)) return { url: copied, origin: "clipboard", service: linkService(copied) };

  return undefined;
};

const SERVICE_LABEL: Record<LinkService, string> = {
  qobuz: "Qobuz",
  spotify: "Spotify",
  "youtube-music": "YouTube Music",
  youtube: "YouTube",
};

export const sourceLabel = ({ origin, service }: PickedLink): string => {
  const from = origin === "link" ? "From link" : "From clipboard";
  return service ? `${from} (${SERVICE_LABEL[service]})` : from;
};
