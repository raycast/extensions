import { $fetch } from "ofetch";

/**
 * Fetch the available categories for Nuxt modules
 *
 * Use this tool when:
 * - You need to know what categories of modules are available
 * - You want to explore modules by category
 * - You need to recommend module categories based on user requirements
 *
 * @returns The list of available module categories
 */
export default async function tool() {
  const { categories } = await $fetch("https://api.nuxt.com/modules/categories");
  return categories as string[];
}
