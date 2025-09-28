import { Cache } from "@raycast/api";

const cache = new Cache({
  namespace: "autocomplete",
});

const autocompleteURL = "https://ac.tureng.co/";
export async function getAutocomplete(input: string): Promise<string[]> {
  if (input.length < 3) {
    return [];
  }

  if (cache.has(input)) {
    return JSON.parse(cache.get(input)!);
  }

  const results = (await fetch(`${autocompleteURL}?t=${input}&l=entr`).then((r) => r.json())) as string[];
  cache.set(input, JSON.stringify(results));

  return results;
}
