import { getPreferenceValues } from "@raycast/api";
import { createTab } from "../lib/browser";
import { resolveInput } from "../lib/url";
import { Preferences } from "../types";

type Input = {
  /** A URL or search query. Omit to open a blank tab. */
  urlOrQuery?: string;
};

export default async function tool({ urlOrQuery }: Input) {
  const target = urlOrQuery?.trim()
    ? resolveInput(urlOrQuery, getPreferenceValues<Preferences>().searchEngine)
    : undefined;
  const result = await createTab(target);
  return { ...result, url: target };
}
