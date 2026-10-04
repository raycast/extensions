import { AI, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  getModels,
  getPreferences,
  probeModelsEndpoint,
  type ModelsProbe,
} from "./catalog";

export type RefreshOutcome = {
  models: AI.RegisteredModel[];
  probe: ModelsProbe;
};

/**
 * One explicit refresh, shared by the Check Setup and Show Models commands:
 * re-runs discovery with both the 60s /models probe cache and the 24h
 * models.dev metadata cache bypassed (concurrent bypasses dedupe onto one
 * fetch each), realigns Raycast's model list, and reports the probe outcome —
 * never a green toast for a key or endpoint that just failed. Returns the
 * fresh discovery for callers that render it, or undefined when the extension
 * is not configured / the refresh failed.
 */
export async function refreshModelsWithToast(): Promise<
  RefreshOutcome | undefined
> {
  const prefs = getPreferences();
  if (!prefs.baseURL || !prefs.apiKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not configured",
      message:
        "Set your API key (and, for the Custom platform, a base URL) in the extension preferences first.",
    });
    return undefined;
  }
  try {
    const [models, probe] = await Promise.all([
      getModels({ bypassCache: true }),
      probeModelsEndpoint(prefs.baseURL, prefs.apiKey, {
        bypassCache: true,
      }),
    ]);
    await AI.refreshModels();
    await showToast(
      probe.ok
        ? {
            style: Toast.Style.Success,
            title: `Model list refreshed (${probe.ids.length} models)`,
          }
        : {
            style: Toast.Style.Failure,
            title: "Refreshed, but validation failed",
            message: probe.message,
          },
    );
    return { models, probe };
  } catch (error) {
    await showFailureToast(error, { title: "Refresh failed" });
    return undefined;
  }
}
