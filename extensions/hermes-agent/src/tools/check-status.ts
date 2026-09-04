import { getPreferences, resolveModelName } from "../api";

/**
 * Check whether the Hermes API server is reachable and return the resolved
 * model name. Use this to diagnose connection or configuration problems.
 */
export default async function (): Promise<{
  enabled: boolean;
  endpoint: string;
  model: string;
  message: string;
}> {
  const prefs = getPreferences();
  try {
    const model = await resolveModelName(prefs);
    return {
      enabled: true,
      endpoint: prefs.endpoint,
      model,
      message: `Hermes API server is reachable at ${prefs.endpoint} (model: ${model})`,
    };
  } catch (error) {
    return {
      enabled: false,
      endpoint: prefs.endpoint,
      model: "",
      message: `Hermes API server is not reachable at ${prefs.endpoint}. Enable it with API_SERVER_ENABLED=true and run \`hermes status\`. Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
