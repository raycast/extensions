import { $fetch } from "ofetch";
import type { Module } from "../types/modules";

type Input = {
  /**
   * The name of the module to fetch
   * @example "ui"
   * @example "algolia"
   * @example "@nuxtjs/tailwindcss"
   */
  name: string;
};

/**
 * Fetch information about a specific Nuxt module by name
 *
 * Use this tool when:
 * - You need detailed information about a specific module
 * - You want to check compatibility, maintainers, or other details of a module
 * - You need to provide specific information about a module to the user
 *
 * @returns The module information if found
 */
export default async function tool(input: Input) {
  const url = `https://api.nuxt.com/modules/${encodeURIComponent(input.name)}`;
  return await $fetch<Module>(url);
}
