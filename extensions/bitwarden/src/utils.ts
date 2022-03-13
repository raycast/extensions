import { Icon } from "@raycast/api";
import { URL } from "url";
import { PasswordGeneratorOptions } from "./types";

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

export function faviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://icons.bitwarden.net/${domain}/icon.png`;
  } catch (err) {
    return Icon.Globe;
  }
}

export function titleCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

type ObjectEntries<Obj> = { [Key in keyof Obj]: [Key, Obj[Key]] }[keyof Obj][];
/** `Object.entries` that preserves the type of the object keys */
export const objectEntries = <Obj>(obj: Obj) => {
  return Object.entries(obj) as ObjectEntries<Obj>;
};

export function getPasswordGeneratingArgs(options: PasswordGeneratorOptions): string[] {
  return Object.entries(options).flatMap(([arg, value]) => (value ? [`--${arg}`, value] : []));
}

export const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
