import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { runCheck, EnginePrefs } from "./engine";

interface RawPrefs {
  customTargets?: string;
  showEgressIp: boolean;
  identifyUpstream: boolean;
}

export function getEnginePrefs(): EnginePrefs {
  const p = getPreferenceValues<RawPrefs>();
  return {
    customTargets: p.customTargets || "",
    showEgressIp: Boolean(p.showEgressIp),
    identifyUpstream: Boolean(p.identifyUpstream),
  };
}

export function useCheck() {
  const prefs = getEnginePrefs();
  return useCachedPromise(() => runCheck(prefs), [], { keepPreviousData: true });
}
