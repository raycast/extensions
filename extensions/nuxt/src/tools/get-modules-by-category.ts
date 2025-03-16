import { $fetch } from "ofetch";
import type { ApiResponse } from "../types/modules.ts";

type Input = {
  /**
   * The category to filter modules by
   * @example "ui"
   * @example "cms"
   * @example "seo"
   */
  category: string;
};

/**
 * Fetch Nuxt modules filtered by category
 *
 * Use this tool when:
 * - You need to find modules in a specific category
 * - You want to recommend modules from a particular category
 * - You need a more focused list of modules than the complete list
 *
 * @returns The list of modules in the specified category
 */
export default async function tool(input: Input) {
  const { modules } = await $fetch<ApiResponse>(
    `https://api.nuxt.com/modules?category=${encodeURIComponent(input.category)}`,
  );
  return modules;
}
