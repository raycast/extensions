import type { Feature } from "../types";

/**
 * Generate full configuration JSON with all options for a feature
 * Used for copying complete devcontainer.json feature configuration
 */
export function generateFullConfiguration(feature: Feature): string {
  const optionsObj: Record<string, string | boolean> = {};
  if (feature.options) {
    for (const [name, option] of Object.entries(feature.options)) {
      if (option.default !== undefined) {
        optionsObj[name] = option.default;
      } else if (option.enum && option.enum.length > 0) {
        optionsObj[name] = option.enum[0];
      } else if (option.type === "boolean") {
        optionsObj[name] = true;
      } else {
        optionsObj[name] = "";
      }
    }
  }

  const config = {
    features: {
      [feature.reference]: optionsObj,
    },
  };
  return JSON.stringify(config, null, 2);
}

/**
 * Generate basic usage example JSON for a feature
 */
export function generateUsageJson(feature: Feature): string {
  return `{
  "features": {
    "${feature.reference}": {}
  }
}`;
}
