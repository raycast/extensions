import { pathToFileURL } from "node:url";

export function imageMarkdown(
  imagePath: string,
  title = "Generated image",
): string {
  const url = `${pathToFileURL(imagePath).toString()}?raycast-width=420&raycast-height=420`;
  return `![${title}](${url})`;
}

export function quoteForMarkdown(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([`*_{}[\]()#+.!|>~-])/g, "\\$1");
}
