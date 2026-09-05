import { getPreferences } from "../api";

interface ModelsList {
  data?: { id?: string }[];
}

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
  const base = prefs.endpoint.replace(/\/+$/, "");

  try {
    const headers: Record<string, string> = {};
    if (prefs.token) {
      headers.Authorization = `Bearer ${prefs.token}`;
    }

    const response = await fetch(`${base}/v1/models`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as ModelsList;
    const ids = (data.data ?? [])
      .map((m) => m.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const configured = (prefs.modelName || "").trim();
    const model =
      configured ||
      (ids.includes("hermes-agent")
        ? "hermes-agent"
        : (ids[0] ?? "hermes-agent"));

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
