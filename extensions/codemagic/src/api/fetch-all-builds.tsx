import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { FetchAllBuildsApiResponse, GroupedAppBuilds } from "../interface/all-builds";

export const fetchAllBuilds = async (): Promise<GroupedAppBuilds[] | null> => {
  const preferences = getPreferenceValues<Preferences>();
  const url = "https://api.codemagic.io/builds";
  const token = preferences["codemagic-access-token"];
  const toast = await showToast(Toast.Style.Animated, "Fetching all Builds...");

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token,
      },
    });

    if (!response.ok) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to load applications and builds";
      return null;
    }

    toast.style = Toast.Style.Animated;
    toast.title = "Processing fetched data";
    const data: FetchAllBuildsApiResponse = (await response.json()) as FetchAllBuildsApiResponse;

    const groupedData: GroupedAppBuilds[] = data.applications.map((app) => ({
      app: app,
      builds: data.builds.filter((build) => build.appId === app._id),
    }));

    toast.style = Toast.Style.Success;
    toast.title = "Fetched all Builds";
    return groupedData;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to load applications and builds";
    return null;
  }
};
