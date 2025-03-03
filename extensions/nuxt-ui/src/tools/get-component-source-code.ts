import { $fetch } from "ofetch";
import { getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * The name of the component to get the source code from
   * IMPORTANT: Use the exact camelCase name from the components list (e.g., "button", "buttonGroup")
   */
  componentName: string;
};

/**
 * Fetch the complete source code for a specified Nuxt UI component
 * This includes props, types, structure, and props documentation
 *
 * This tool MUST be called after get-component-theme (except when user asks for props or related information)
 *
 * @param input.componentName The exact camelCase name from the components list (e.g., "button", "buttonGroup")
 * @returns The full source code of the component as a string
 */
export default async function tool(input: Input) {
  // Convert first letter to uppercase for the API call
  const { version } = getPreferenceValues<Preferences>();
  const componentName = input.componentName.charAt(0).toUpperCase() + input.componentName.slice(1);

  return await $fetch(
    `https://raw.githubusercontent.com/nuxt/ui/refs/heads/${version}/src/runtime/components/${componentName}.vue`,
    {
      method: "GET",
      headers: {
        "Content-Type": "text/plain",
      },
    },
  );
}
