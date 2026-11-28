import { getPreferenceValues } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { canRecoverLocally } from "../utils/submitGuard";

/**
 * Whether offering a "Start Karakeep" action could actually accomplish
 * anything — i.e. a stopped local container exists that we could start.
 *
 * Gate the action on this, not merely on being offline. A hosted instance has
 * nothing local to start, so the action would run the probe and do nothing
 * visible: a button that lies about what it does.
 *
 * @param enabled pass the view's offline condition. The Docker probe only runs
 * once the server is known to be down, so a healthy hosted user never shells
 * out to the docker CLI at all.
 */
export function useCanRecoverLocally(enabled: boolean): boolean {
  const { apiUrl } = getPreferenceValues<Preferences>();
  const [canStart, setCanStart] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const recoverable = await canRecoverLocally(apiUrl);
      if (!cancelled && mounted.current) setCanStart(recoverable);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, apiUrl]);

  return canStart;
}
