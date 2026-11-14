import { pathToFileURL } from "node:url";

export function fileUrl(path: string): string {
  return pathToFileURL(path).href.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

export function imageMarkdown(path: string, title = "Icon", size?: number): string {
  const dimensions = size ? `?raycast-width=${size}&raycast-height=${size}` : "";
  return `![${title}](${fileUrl(path)}${dimensions})`;
}
