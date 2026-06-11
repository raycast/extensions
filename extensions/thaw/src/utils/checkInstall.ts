import { getApplications } from "@raycast/api";

export const THAW_INSTALL_URL = "https://github.com/stonerl/Thaw";

export const isThawInstalled = async (): Promise<boolean> => {
  const apps = await getApplications();
  return apps.some((app) => app.name.toLowerCase() === "thaw");
};
