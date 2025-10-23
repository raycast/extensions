import { $currentEnvironmentId, $environments } from "~/store/environments";

/**
 * Builds the final, resolved map of variables for the active environment,
 * giving the active environment's variables precedence over Globals.
 */
export function resolveVariables(): Record<string, string> {
  const allEnvironments = $environments.get();
  const activeId = $currentEnvironmentId.get();

  if (!allEnvironments || allEnvironments.length === 0) {
    return {};
  }

  const activeEnv = allEnvironments.find((e) => e.id === activeId);

  const resolved: Record<string, string> = {};

  if (!activeEnv) {
    return {}; // ✅ No active environment = no variables
  }

  // Add active environment variables, overwriting globals with the same key.
  if (activeEnv) {
    for (const [key, variable] of Object.entries(activeEnv.variables)) {
      resolved[key] = variable.value;
    }
  }

  return resolved;
}

/**
 * Replaces all {{...}} placeholders in a string with values from a variables object.
 * Safely handles undefined input.
 */
export function substitutePlaceholders(
  input: string | undefined,
  variables: Record<string, string>,
): string | undefined {
  // If the input is undefined, just return undefined right away.
  if (!input) {
    return undefined;
  }

  return input.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    return variables[key] || match;
  });
}

/**
 * Safely gets a nested value from an object using a path string.
 * @param obj The object to search.
 * @param path The path string (e.g., "user.address.city").
 * @returns The found value or undefined if the path is invalid.
 */
export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    // Use optional chaining to safely access nested properties
    if (current != null && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
