import { $fetch } from "ofetch";
import { getDocsUrl } from "../utils/search";

type Input = {
  /**
   * The name of the component to get the documentation from
   * IMPORTANT: Use the exact camelCase name from the components list (e.g., "button", "buttonGroup")
   */
  componentName: string;
};

/**
 * Fetch the complete documentation for a specified Nuxt UI component
 *
 * This tool MUST be called after get-component-theme (except when user asks for props or related information)
 *
 * @param input.componentName The exact camelCase name from the components list (e.g., "button", "buttonGroup")
 * @returns The full documentation of the component as a string
 */
export default async function tool(input: Input) {
  // Convert first letter to uppercase for the API call
  const componentName = input.componentName.charAt(0).toUpperCase() + input.componentName.slice(1);

  return await $fetch(`${getDocsUrl()}/raw/components/${componentName}.md`, {
    method: "GET",
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
