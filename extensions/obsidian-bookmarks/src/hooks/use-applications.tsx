import { Application, FileIcon, getApplications } from "@raycast/api";
import { ReactNode, useContext, useMemo } from "react";
import useLoadable, { createLoadableContext, Loadable } from "./use-loader";

const ApplicationsContext = createLoadableContext<Application[]>();

type ApplicationsProviderProps = { children: ReactNode };
export function ApplicationsProvider({ children }: ApplicationsProviderProps): JSX.Element {
  const applications = useLoadable(() => getApplications());

  return <ApplicationsContext.Provider value={applications}>{children}</ApplicationsContext.Provider>;
}

export function useApplicationList(): Loadable<Application[]> {
  const result = useContext(ApplicationsContext);
  if (result == null) {
    throw new Error("useApplications() must be used inside an <ApplicationsProvider>");
  }
  return result;
}

export function useApplicationMap(): Loadable<Map<string, Application>> {
  const apps = useApplicationList();
  const appMap = useMemo(() => {
    if (!apps.value) return undefined;
    const map = new Map<string, Application>();
    apps.value.forEach((app) => {
      map.set(app.name, app);
      if (app.bundleId) {
        map.set(app.bundleId, app);
      }
    });
    return map;
  }, [apps]);
  return { loading: apps.loading, value: appMap };
}

export function useApplication(nameOrBundleId: string): Loadable<Application> {
  const apps = useApplicationMap();
  return {
    loading: apps.loading,
    value: apps.value?.get(nameOrBundleId),
  };
}

export function useFileIcon(nameOrBundleId: string): Loadable<FileIcon> {
  const app = useApplication(nameOrBundleId);
  return {
    loading: app.loading,
    value: app.value ? { fileIcon: app.value.path } : undefined,
  };
}
