import { Application, getApplications } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Openable } from "../types/openable";
import { getCompatibleApplications } from "../utitlities/swift/get-compatible-applications";
import { getDefaultApplication } from "../utitlities/swift/get-default-application";

export function useApps(
  openable: Openable | undefined,
  options?: { onData?: (data: { defaultApp: Application }) => void },
) {
  const {
    data,
    isLoading: isLoading,
    mutate,
    revalidate,
    error,
  } = usePromise(
    async (openable: Openable | undefined) => {
      if (openable === undefined) {
        return undefined;
      }

      const defaultApp = await getDefaultApplication(openable);

      const compatibleApps = (await getCompatibleApplications(openable))
        .filter((app) => app.path !== defaultApp?.path)
        .sort((a, b) => a.name.localeCompare(b.name));

      const allInstalledApps = await getApplications();

      const otherApps = allInstalledApps
        .filter((app) => app.path !== defaultApp?.path)
        .filter((app) => !compatibleApps?.some((s) => s.path === app.path))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        defaultApp,
        compatibleApps,
        otherApps,
      };
    },
    [openable],
    {
      onData: (data) => {
        if (data) {
          options?.onData?.(data);
        }
      },
      execute: openable !== undefined,
    },
  );

  return {
    apps: openable !== undefined ? data : undefined,
    isLoadingApps: isLoading,
    mutateApps: mutate,
    revalidateApps: revalidate,
    appsError: error,
  };
}
