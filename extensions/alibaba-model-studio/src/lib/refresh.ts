import { AI, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  getModels,
  getPreferences,
  probeModelsEndpoint,
  probeWorkspace,
  type ModelsProbe,
} from "./catalog";

export type RefreshOutcome =
  | {
      status: "ok";
      models: AI.RegisteredModel[];
      probe: Extract<ModelsProbe, { ok: true }>;
    }
  | { status: "failed"; probe: Extract<ModelsProbe, { ok: false }> };

/**
 * One explicit refresh, shared by the Check Setup and Show Models commands:
 * re-runs discovery with both the 60s /models probe cache and the 24h
 * models.dev metadata cache bypassed (concurrent bypasses dedupe onto one
 * fetch each), realigns Raycast's model list, and reports the probe outcome —
 * never a green toast for a key or endpoint that just failed. Returns "ok"
 * with the fresh discovery, or "failed" with the probe outcome so callers can
 * keep their current list (which is what the picker serves) while surfacing
 * the failure; undefined means the extension is not configured or the refresh
 * threw.
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
      probeModelsEndpoint(
        prefs.baseURL,
        prefs.apiKey,
        probeWorkspace(prefs.platform, prefs.workspaceId),
        {
          bypassCache: true,
        },
      ),
    ]);
    await AI.refreshModels();
    await showToast(
      probe.ok
        ? {
            style: Toast.Style.Success,
            // Registered models, not the raw /models id count — DashScope
            // lists many non-chat services that discovery filters out.
            title: `Model list refreshed (${models.length} models)`,
          }
        : {
            style: Toast.Style.Failure,
            title: "Refreshed, but validation failed",
            message: probe.message,
          },
    );
    // On a failed probe the fresh discovery is a fallback list, while
    // Raycast's picker keeps serving its cached discovery until the TTL
    // expires — handing it to callers would desync the view from the picker.
    // Report the failure instead: callers keep their current list and surface
    // it in the view. The toast above already reported it too.
    if (!probe.ok) return { status: "failed", probe };
    return { status: "ok", models, probe };
  } catch (error) {
    await showFailureToast(error, { title: "Refresh failed" });
    return undefined;
  }
}
