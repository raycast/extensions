import { $fetch } from "ofetch";
import { getPreferenceValues } from "@raycast/api";
import { sanitizeComponentName } from "../utils/components";

type Input = {
  /**
   * The name of the component to get the theme from
   */
  componentName: string;
};

/**
 * Fetch the complete theme configuration for a specified Nuxt UI component
 *
 * This tool MUST be called after get-available-components and before get-component-source-code
 *
 * @returns The component's theme configuration as a string
 */
export default async function tool(input: Input) {
  const { version, prefix } = getPreferenceValues<Preferences>();
  return await $fetch(
    `https://raw.githubusercontent.com/nuxt/ui/refs/heads/${version}/src/theme/${sanitizeComponentName(input.componentName, prefix)}.ts`,
    {
      method: "GET",
      headers: {
        "Content-Type": "text/plain",
      },
    },
  );
}
