import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { runCheck, EnginePrefs } from "./engine";

export function getEnginePrefs(): EnginePrefs {
  const p = getPreferenceValues<Preferences>();
  return {
    customTargets: p.customTargets || "",
    showEgressIp: p.showEgressIp,
    identifyUpstream: p.identifyUpstream,
  };
}

export function useCheck() {
  const prefs = getEnginePrefs();
  return useCachedPromise(() => runCheck(prefs), [], { keepPreviousData: true });
}
