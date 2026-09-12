import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fetch from "node-fetch";
import { CodemagicApp, CodemagicAppResponse } from "../interface/codemagic-apps";
import { capitalize } from "../util/capitalise";
import { fetchBuildStatus } from "./fetch_build-status";
import { refreshBranches } from "./refresh-branches";

export enum FetchAppState {
  SUCCESS = "success",
  NO_FLUTTER_APPS = "no_flutter_apps",
  NO_CONFIGURED_APPS = "no_configured_apps",
  NO_UI_SETTINGS = "no_ui_settings",
  ERROR = "error",
}

export const fetchApplicationsAndRefreshBranches = async (): Promise<
  [FetchAppState, Record<string, CodemagicApp[]> | null]
> => {
  const preferences = getPreferenceValues<Preferences>();
  const toast = await showToast(Toast.Style.Animated, "Fetching applications...");

  try {
    const response = await fetch("https://api.codemagic.io/apps", {
      headers: {
        Authorization: `Bearer ${preferences["codemagic-access-token"]}`,
      },
    });

    if (!response.ok) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to load applications";
      toast.message = "Please check your access token";
      return [FetchAppState.ERROR, null];
    }

    const data: CodemagicAppResponse = (await response.json()) as CodemagicAppResponse;

    const flutterApps = data.applications.filter(
      (app) => app.projectType === "flutter-app" || app.projectType === "flutter-package",
    );

    if (flutterApps.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "No Flutter apps found";
      return [FetchAppState.NO_FLUTTER_APPS, null];
    }

    const configuredApps: CodemagicApp[] = await Promise.all(
      flutterApps
        .filter((app) => app.isConfigured === true)
        .map(async (app) => {
          toast.style = Toast.Style.Animated;
          toast.title = "Fetching last build status for each application";
          let lastBuild = null;
          if (app.lastBuildId) {
            lastBuild = await fetchBuildStatus(app.lastBuildId);
          }
          return { ...app, lastBuild };
        }),
    );

    if (configuredApps.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "No configured apps found";
      return [FetchAppState.NO_CONFIGURED_APPS, null];
    }

    const uiConfiguredApps = configuredApps.filter((app) => app.settingsSource === "ui");

    if (uiConfiguredApps.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "No apps with UI-based settings found";
      return [FetchAppState.NO_UI_SETTINGS, null];
    }

    toast.style = Toast.Style.Animated;
    toast.title = "Refreshing branches";

    for (const app of uiConfiguredApps) {
      await refreshBranches(app._id);
    }
    const updatedResponse = await fetch("https://api.codemagic.io/apps", {
      headers: {
        Authorization: `Bearer ${preferences["codemagic-access-token"]}`,
      },
    });

    if (!updatedResponse.ok) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to fetch updated applications";
      return [FetchAppState.ERROR, null];
    }

    const updatedData: CodemagicAppResponse = (await updatedResponse.json()) as CodemagicAppResponse;

    const updatedFlutterApps = updatedData.applications.filter(
      (app) => app.projectType === "flutter-app" || app.projectType === "flutter-package",
    );

    const updatedConfiguredApps = updatedFlutterApps
      .filter((updatedApp) => updatedApp.isConfigured === true)
      .map((updatedApp) => {
        const originalApp = uiConfiguredApps.find((app) => app._id === updatedApp._id);
        return {
          ...updatedApp,
          lastBuild: originalApp?.lastBuild || null,
        };
      });

    const groupedApps: Record<string, CodemagicApp[]> = updatedConfiguredApps.reduce(
      (groups, app) => {
        const ownerName = capitalize(app.repository.owner.name);
        if (!groups[ownerName]) {
          groups[ownerName] = [];
        }
        groups[ownerName].push(app);
        return groups;
      },
      {} as Record<string, CodemagicApp[]>,
    );

    toast.style = Toast.Style.Animated;
    toast.title = "Sorting applications based on organization";
    const sortedGroupedApps: Record<string, CodemagicApp[]> = Object.keys(groupedApps)
      .sort()
      .reduce(
        (sortedGroups, key) => {
          sortedGroups[key] = groupedApps[key];
          return sortedGroups;
        },
        {} as Record<string, CodemagicApp[]>,
      );

    toast.style = Toast.Style.Success;
    toast.title = "Applications and branches updated successfully";
    return [FetchAppState.SUCCESS, sortedGroupedApps];
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to load applications or refresh branches";
    console.error(error);
    return [FetchAppState.ERROR, null];
  }
};
export const useFetchApplicationsAndRefreshBranches = () => {
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchApplicationsAndRefreshBranches, []);

  return {
    data,
    isLoading,
    error,
    revalidate,
  };
};
