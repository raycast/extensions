import { parse } from "valibot";
import { response_schema } from "../schema";
import { limit_size } from "../limit-size";

type Input = {
  /**
   * A required space separated list of words to search for in the Svelte documentation. A record will be returned if any of the keyword is found in the text. It should not include common words like 'in', '5' or even 'svelte'...just pass a set of keywords that can help filter a large list.
   */
  query: string;
};

export default async function search_svelte_docs(input: Input) {
  const unparsed_svelte_items = await fetch(`https://svelte.dev/content.json`).then((res) => res.json());
  const svelte_items = parse(response_schema, unparsed_svelte_items);
  const keywords = input?.query?.split(" ") ?? [];
  return limit_size(
    svelte_items?.blocks
      .filter((block) => keywords.some((keyword) => block.content.toLowerCase().includes(keyword.toLowerCase())))
      .map((block) => ({ ...block, breadcrumbs: block.breadcrumbs.join(" ") })) ?? [],
  );
}
