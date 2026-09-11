import { Toast, showToast } from "@raycast/api";
import { Sandbox } from "@daytona/sdk";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createDaytonaClient, getDaytonaErrorMessage } from "./daytona-client";
import { getDaytonaPreferences, resolveDaytonaApiUrl, resolveDaytonaTarget } from "./daytona-preferences";

const SANDBOXES_PAGE_SIZE = 100;
const MAX_SANDBOX_LIST_PAGES = 20;

export function useDaytonaClient() {
  const preferences = getDaytonaPreferences();
  const apiUrl = resolveDaytonaApiUrl(preferences);
  const target = resolveDaytonaTarget(preferences);

  return useMemo(() => createDaytonaClient(preferences), [preferences.apiKey, apiUrl, target]);
}

export function useSandboxList() {
  const daytona = useDaytonaClient();
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const loadSandboxes = useCallback(async () => {
    setIsLoading(true);
    setLoadingError(null);

    try {
      const allSandboxes: Sandbox[] = [];
      const maxSandboxes = MAX_SANDBOX_LIST_PAGES * SANDBOXES_PAGE_SIZE;

      for await (const sandbox of daytona.list({ limit: SANDBOXES_PAGE_SIZE })) {
        allSandboxes.push(sandbox);

        if (allSandboxes.length >= maxSandboxes) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Sandbox list may be incomplete",
            message: `Showing first ${allSandboxes.length} sandboxes. Refine pagination if needed.`,
          });
          break;
        }
      }

      setSandboxes(allSandboxes);
    } catch (error) {
      setLoadingError(getDaytonaErrorMessage(error));
      setSandboxes([]);
    } finally {
      setIsLoading(false);
    }
  }, [daytona]);

  useEffect(() => {
    loadSandboxes();
  }, [loadSandboxes]);

  return { sandboxes, isLoading, loadingError, loadSandboxes };
}
