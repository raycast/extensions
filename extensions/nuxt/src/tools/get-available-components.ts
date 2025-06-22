import { components, proseComponents, proComponents } from "../utils/components-list";

/**
 * Get the list of all available Nuxt UI components
 *
 * This tool MUST be called first for any component-related request to:
 * - Verify if a requested component exists
 * - Find suitable alternatives when a component doesn't exist directly
 * - Determine the appropriate component type (basic, pro, or prose)
 *
 * @returns Categorized lists of all available components
 */
export default function tool() {
  return {
    components, // Basic components (free, prefixed with U)
    proComponents, // Pro components (paid version)
    proseComponents, // Prose components (for content)
  };
}
