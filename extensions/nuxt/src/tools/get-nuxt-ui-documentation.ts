import { $fetch } from "ofetch";

/**
 * Fetch the complete documentation of Nuxt UI
 *
 * Use this tool when:
 * - You need general information about Nuxt UI usage
 * - Component-specific information isn't available from other tools
 * - You need to understand broader concepts or patterns
 *
 * Note: For component-specific information, prefer using the sequence:
 * 1. get-available-components
 * 2. get-component-theme
 * 3. get-component-source-code
 *
 * @returns The full Nuxt UI documentation as a string
 */
export default async function tool() {
  return await $fetch("https://ui3.nuxt.dev/llms.txt", {
    method: "GET",
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
