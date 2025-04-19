import { parse } from "valibot";
import { response_schema } from "../schema";

type Input = {
  /**
   * A space separated list of words to search for in the Svelte documentation. A record will be returned if any of the keyword is found in the text.
   */
  query: string;
};

export default async function (input: Input) {
  const unparsed_svelte_items = await fetch(`https://svelte.dev/content.json`).then((res) => res.json());
  const svelte_items = parse(response_schema, unparsed_svelte_items);
  const keywords = input.query.split(" ");
  return svelte_items?.blocks.filter((block) => keywords.some((keyword) => block.content.includes(keyword)));
}
