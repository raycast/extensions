import { fetchNuxtDocMarkdown } from "../utils/docs";

type Input = {
  // Path relative to the versioned docs base, e.g. "/getting-started/introduction"
  path: string;
};

/**
 * Fetch the raw markdown content of a Nuxt documentation page.
 * Example: base=https://nuxt.com/docs/4.x + path=/getting-started/introduction
 * Raw URL will be: https://nuxt.com/raw/docs/4.x/getting-started/introduction.md
 */
export default async function tool(input: Input) {
  return await fetchNuxtDocMarkdown(input.path);
}
