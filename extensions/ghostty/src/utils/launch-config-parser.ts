import { parse as parseYAML } from "yaml";
import type { LaunchConfig } from "./types";

export function parseLaunchConfig(yaml: string): LaunchConfig {
  const config = parseYAML(yaml) as LaunchConfig;

  if (!config?.name) {
    throw new Error("YAML must include a 'name' field");
  }

  if (!Array.isArray(config.windows)) {
    throw new Error("YAML must include a 'windows' array");
  }

  for (const [index, window] of config.windows.entries()) {
    if (!window || typeof window !== "object") {
      throw new Error(`windows[${index}] must be an object`);
    }
    if (window.open_in_new_window !== undefined && typeof window.open_in_new_window !== "boolean") {
      throw new Error(`windows[${index}].open_in_new_window must be true or false (without quotes)`);
    }
  }

  return config;
}
