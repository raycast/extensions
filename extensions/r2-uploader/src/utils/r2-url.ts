import path from "path";
import { escapeHtmlAttribute, escapeMarkdownAlt } from "./text-escaping";

function encodeKeyPath(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function getPublicBaseUrl(customDomain?: string): string {
  if (!customDomain?.trim()) {
    throw new Error(
      "Set Public Base URL to your bucket's custom domain or https://pub-xxx.r2.dev in extension preferences.",
    );
  }

  let url: URL;
  try {
    url = new URL(customDomain.trim());
  } catch {
    throw new Error("Public Base URL must be a full URL, such as https://cdn.example.com or https://pub-xxx.r2.dev.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.hostname === "r2.cloudflarestorage.com" ||
    url.hostname.endsWith(".r2.cloudflarestorage.com") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("Use a public custom domain or r2.dev URL without credentials, query parameters, or a fragment.");
  }
  return url.toString().replace(/\/+$/, "");
}

export function formatPublicLinks(key: string, publicBaseUrl: string) {
  const url = `${publicBaseUrl}/${encodeKeyPath(key)}`;
  const alt = path.basename(key, path.extname(key));
  const markdown = `![${escapeMarkdownAlt(alt)}](${url.replaceAll("(", "%28").replaceAll(")", "%29")})`;
  const html = `<img src="${escapeHtmlAttribute(url)}" alt="${escapeHtmlAttribute(alt)}" />`;
  return { url, markdown, html };
}
