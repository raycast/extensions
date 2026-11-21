export type Postprocessing = "default" | "audio" | "mp4";
export interface DownloadOptions {
  postprocessing: Postprocessing;
  destination?: string;
  extraction?: boolean;
}

export function parseLinks(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) throw new Error("Enter at least one HTTP or HTTPS URL, one per line.");
  if (lines.length > 50) throw new Error("Send up to 50 links at a time.");
  const links: string[] = [];
  for (const line of lines) {
    let url: URL;
    try {
      if (/\s/.test(line)) throw new Error();
      url = new URL(line);
    } catch {
      throw new Error("Each line must contain one complete URL.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Use HTTP or HTTPS video URLs.");
    if (!links.includes(line)) links.push(line);
  }
  return links;
}

export function buildDownieURL(link: string, options: DownloadOptions): string {
  if (parseLinks(link).length !== 1 || /[\r\n]/.test(link))
    throw new Error("Build a download request for one URL at a time.");
  const url = new URL("downie://XUOpenURL");
  url.searchParams.set("url", link);
  if (options.extraction) url.searchParams.set("action", "open_in_uge");
  else if (options.postprocessing !== "default") url.searchParams.set("postprocessing", options.postprocessing);
  if (options.destination) url.searchParams.set("destination", options.destination);
  return url.toString();
}
