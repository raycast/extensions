import { parse } from "node-html-parser";
import { ApiService } from "./ApiService";

/**
 * Transform a word in a singular or plural form.
 *
 * @param total Total of elements.
 * @param value Word to transform.
 * @param suffix Suffix to add to the word.
 *
 * @returns The word in a singular or plural form.
 */
export function pluralize(total: number, value: string, suffix = "s"): string {
  if (total <= 1) {
    return value;
  }

  return `${value}${suffix}`;
}

export const fetchLatestJSFileUrl = async () => {
  const response = await ApiService.getInstance().get("/");
  const text = response.data;

  const root = parse(text);
  const scriptTags = root.getElementsByTagName("script");
  const latestScriptTag = scriptTags.find((tag) => tag.rawAttrs.includes("_app"));

  if (latestScriptTag) {
    return latestScriptTag.rawAttributes.src;
  }

  throw new Error("Latest JS file not found");
};

export const fetchLatestHash = async () => {
  const jsFileUrl = await fetchLatestJSFileUrl();
  const response = await ApiService.getInstance().get(jsFileUrl);

  const text = response.data as string;

  const apiFindRegex = /fetch\("\/api\/seek\/"\s*\.concat\("([^"]+)"\)\s*\.concat\("([^"]+)"\)/;
  const match = text.match(apiFindRegex);

  let hashParts: string[] = [];
  if (match) {
    hashParts = [match[1], match[2]];
  }

  const hash = hashParts.join("");

  if (hash) {
    return hash;
  }

  throw new Error("Hash not found");
};
