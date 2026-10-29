/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { getApplications } from "@raycast/api";
import { usePromise } from "@raycast/utils";

/**
 * Eudic bundle IDs.
 *
 * There are two Eudic versions on macOS:
 * - Free: com.eusoft.freeeudic
 * - Paid: com.eusoft.eudic
 *
 * Both use the same URL scheme: eudic://
 */
const EUDIC_BUNDLE_IDS = new Set(["com.eusoft.freeeudic", "com.eusoft.eudic"]);

const EUDIC_WINDOWS_APP_ID = "eudic.exe";

async function checkIfInstalledEudic() {
  const applications = await getApplications();

  return applications.some(
    ({ bundleId, windowsAppId }) =>
      (bundleId ? EUDIC_BUNDLE_IDS.has(bundleId) : false) || windowsAppId === EUDIC_WINDOWS_APP_ID,
  );
}

/**
 * Detects whether Eudic is installed on the system.
 *
 * Uses `usePromise` with `[]` deps — fires once per command invocation.
 * Deliberately does NOT use `useCachedState`: the result reflects current
 * system state, and caching would show stale values across sessions.
 */
export function useInstalledEudic() {
  const { data: isInstalledEudic } = usePromise(checkIfInstalledEudic, []);

  return { isInstalledEudic: isInstalledEudic ?? false };
}
