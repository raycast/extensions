import { showToast, Toast } from "@raycast/api";
import { Detail } from "./types";

export function trim(url: string) {
  return url.trim();
}

export function parse(url: string): Detail | undefined {
  try {
    const { href, protocol, hostname, port, origin, hash, pathname: path, searchParams: queries } = new URL(url);
    return {
      href,
      protocol,
      hostname,
      port,
      origin,
      hash,
      path: decodeURIComponent(path),
      queries: Object.fromEntries(queries),
    };
  } catch {
    showToast({
      title: "URL parse failed!",
      style: Toast.Style.Failure,
    });
  }
}

export function toMarkdown(url: Detail) {
  return [
    "## URL Details",
    `- ${url.href.length} characters.`,
    `\`\`\`json\n${JSON.stringify(url, null, 2)}\n\`\`\``,
  ].join("\n\n");
}

export function isURLLike(url: string) {
  const reg = /^[a-zA-Z]+:\/\/.+/i;
  return reg.test(url.trim());
}
