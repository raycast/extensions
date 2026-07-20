import { useMemo } from "react";
import { useAtom } from "zod-persist/react";
import { $environments, $currentEnvironmentId } from "~/store/environments";

/**
 * Hook to get the resolved variables from the current environment.
 * Merges global variables with active environment variables.
 * Safe to use during render - waits for atom hydration.
 */
export function useVariables(): Record<string, string> {
  const { value: environments } = useAtom($environments);
  const { value: currentEnvironmentId } = useAtom($currentEnvironmentId);

  return useMemo(() => {
    const activeEnv = environments.find((e) => e.id === currentEnvironmentId);

    const resolved: Record<string, string> = {};

    // Add active environment variables (overrides globals)
    if (activeEnv) {
      for (const [key, variable] of Object.entries(activeEnv.variables)) {
        resolved[key] = variable.value;
      }
    }

    return resolved;
  }, [environments, currentEnvironmentId]);
}
