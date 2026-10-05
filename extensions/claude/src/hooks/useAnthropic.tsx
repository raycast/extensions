import { getPreferenceValues } from "@raycast/api";
import Anthropic from "@anthropic-ai/sdk";
import { useMemo } from "react";

/**
 * Reads `apiKey` fresh on every call and memoizes the client keyed on that value, so a
 * key changed in Preferences after mount (e.g. via the "Open Extension Preferences"
 * toast action) takes effect on the next request without a relaunch. Construction is
 * cheap — it opens no connection — so re-creating on a key change costs nothing.
 */
export function useAnthropic(): Anthropic {
  const { apiKey } = getPreferenceValues<Preferences>();

  return useMemo(() => new Anthropic({ apiKey }), [apiKey]);
}
