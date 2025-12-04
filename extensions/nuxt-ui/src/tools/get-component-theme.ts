import { $fetch } from "ofetch";
import { getPreferenceValues } from "@raycast/api";

type Input = {
  /**
   * The name of the component to get the theme from
   * IMPORTANT: Use the exact camelCase name from the components list (e.g., "button", "buttonGroup")
   */
  componentName: string;
};

/**
 * Fetch the complete theme configuration for a specified Nuxt UI component
 *
 * This tool MUST be called after get-available-components and before get-component-source-code
 *
 * @param input.componentName The exact camelCase name from the components list (e.g., "button", "buttonGroup")
 * @returns The component's theme configuration as a string
 */
export default async function tool(input: Input) {
  const { version } = getPreferenceValues<Preferences>();
  return await $fetch(
    `https://raw.githubusercontent.com/nuxt/ui/refs/heads/${version}/src/theme/${input.componentName}.ts`,
    {
      method: "GET",
      headers: {
        "Content-Type": "text/plain",
      },
    },
  );
}
