import { $fetch } from "ofetch";
import { getDocsUrl } from "../utils/search";
import { sanitizeComponentName } from "../utils/components";
import { getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * The name of the component to get the documentation from
   * IMPORTANT: Use the exact camelCase name from the components list (e.g., "button", "buttonGroup")
   */
  componentName: string;
};

/**
 * Fetch the complete documentation for a specified Nuxt UI component (Usage, Props, Code Examples, Slots, Theme info)
 *
 * This tool should be called for ALL component requests as it provides comprehensive information including:
 * - Props and their types
 * - Usage examples and best practices
 * - Slot information and structure
 * - Event handlers and callbacks
 * - Theme and styling information
 *
 * @param input.componentName The exact camelCase name from the components list (e.g., "button", "buttonGroup")
 * @returns The full documentation of the component as a string
 */
export default async function tool(input: Input) {
  const { prefix } = getPreferenceValues();
  const sanitizedComponentName = sanitizeComponentName(input.componentName, prefix ?? "U");
  const url = getDocsUrl().replace("/docs", "/raw/docs/components");
  return await $fetch(`${url}/${sanitizedComponentName}.md`, {
    method: "GET",
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
