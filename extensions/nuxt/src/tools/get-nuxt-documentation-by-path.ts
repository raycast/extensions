import { $fetch } from "ofetch";
import { getNuxtDocsUrl } from "../utils/search";

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
  const base = getNuxtDocsUrl(); // e.g., https://nuxt.com/docs/4.x
  const normalized = (input.path || "").replace(/\/(index)?$/, "");
  const path = normalized.endsWith(".md") ? normalized : `${normalized}.md`;

  const rawBase = base.replace("/docs/", "/raw/docs/");
  const url = `${rawBase}${path}`;

  return await $fetch(url, {
    method: "GET",
    headers: { "Content-Type": "text/plain" },
  });
}
