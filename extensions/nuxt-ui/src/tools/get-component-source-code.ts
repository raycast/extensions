import { $fetch } from "ofetch";

type Input = {
  /**
   * The name of the component to get the source code from
   * IMPORTANT: Use the exact camelCase name from the components list (e.g., "button", "buttonGroup")
   */
  componentName: string;
};

/**
 * Fetch the complete source code for a specified Nuxt UI component
 *
 * This tool MUST be called after get-component-theme
 *
 * @param input.componentName The exact camelCase name from the components list (e.g., "button", "buttonGroup")
 * @returns The full source code of the component as a string
 */
export default async function tool(input: Input) {
  // Convert first letter to uppercase for the API call
  const componentName = input.componentName.charAt(0).toUpperCase() + input.componentName.slice(1);

  return await $fetch(
    `https://raw.githubusercontent.com/nuxt/ui/refs/heads/v3/src/runtime/components/${componentName}.vue`,
    {
      method: "GET",
      headers: {
        "Content-Type": "text/plain",
      },
    },
  );
}
