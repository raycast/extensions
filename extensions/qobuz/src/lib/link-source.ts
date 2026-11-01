import { linkService, type LinkService } from "./resolve";

export type LinkOrigin = "link" | "clipboard";

export type PickedLink = { url: string; origin: LinkOrigin; service: LinkService | undefined };

// A typed link always wins, even one that turns out unusable: it says what to
// open, so a failure is reported rather than quietly opening whatever the
// clipboard holds. The clipboard only counts when it holds a link from a
// supported service, since most of the time it holds something else entirely;
// a playlist or an artist page still counts, so it can be named as unsupported.
export const pickLink = (argument: string, clipboard: string | undefined): PickedLink | undefined => {
  const typed = argument.trim();
  if (typed) return { url: typed, origin: "link", service: linkService(typed) };

  const copied = clipboard?.trim() ?? "";
  if (linkService(copied)) return { url: copied, origin: "clipboard", service: linkService(copied) };

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
