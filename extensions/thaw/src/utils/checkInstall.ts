import { getApplications } from "@raycast/api";

export const THAW_INSTALL_URL = "https://github.com/stonerl/Thaw";

const THAW_APP_NAME_PATTERN = /^thaw(?:[\s._-]?(?:debug|dev))?$/;
const THAW_BUNDLE_OR_PATH_PATTERN = /(?:[.-]thaw(?:[.-](?:debug|dev))?)$/;
const APP_SUFFIX_PATTERN = /\.app$/i;

const isThawApp = (value?: string): boolean => {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();
  return THAW_APP_NAME_PATTERN.test(normalizedValue) || THAW_BUNDLE_OR_PATH_PATTERN.test(normalizedValue);
};

export const findThawApplication = async () => {
  const apps = await getApplications();
  return apps.find((app) => {
    const pathName = app.path.split("/").pop()?.replace(APP_SUFFIX_PATTERN, "");

    return [app.name, app.localizedName, app.bundleId, pathName].some(isThawApp);
  });
};

export const isThawInstalled = async (): Promise<boolean> => {
  return Boolean(await findThawApplication());
};
