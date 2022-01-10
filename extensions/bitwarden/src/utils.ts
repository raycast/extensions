import { Icon } from "@raycast/api";
import { URL } from "url";

export function codeBlock(content: string): string {
  return "```\n" + content + "\n```";
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
export function filterNullishPropertiesFromObject(obj: any): any {
  if (!obj) return obj;
  const noNullish: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key) && (obj[key] ?? false)) {
      noNullish[key] = obj[key];
    }
  }

  return noNullish;
}

export function faviconUrl(size: number, url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;
  } catch (err) {
    return Icon.Globe;
  }
}

export function titleCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
