// gcloud glue for the Composer service: access tokens, shared with the rest of the extension via
// utils/gcpApi.
//
// Composer 2/3 gate the Airflow web server with IAM, so the same OAuth *access* token works for the
// Composer API and the Airflow REST API. An identity token returns 401 with an HTML body.

import { clearTokenCache, getAccessToken } from "../../../utils/gcpApi";

/** A token provider; the HTTP clients call get(true) once after a 401. */
export interface TokenProvider {
  get(force?: boolean): Promise<string>;
}

/**
 * Token provider backed by the extension-wide token cache. `gcloudPath` may resolve lazily.
 * Concurrent callers share one in-flight fetch (a cold cache would otherwise spawn one gcloud
 * process per parallel request); forced refreshes after a 401 are shared the same way.
 */
export function gcloudTokenProvider(gcloudPath: string | (() => Promise<string>)): TokenProvider {
  const resolve = typeof gcloudPath === "string" ? async () => gcloudPath : gcloudPath;
  let pending: Promise<string> | undefined;
  let forcing: Promise<string> | undefined;
  const fetchToken = async (force: boolean) => {
    if (force) clearTokenCache();
    return getAccessToken(await resolve());
  };
  return {
    get: (force = false) => {
      if (force) {
        forcing ??= fetchToken(true).finally(() => (forcing = undefined));
        return forcing;
      }
      if (forcing) return forcing;
      pending ??= fetchToken(false).finally(() => (pending = undefined));
      return pending;
    },
  };
}
