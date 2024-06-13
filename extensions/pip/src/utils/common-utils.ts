import { getApplications, getFrontmostApplication } from "@raycast/api";
import { TEST_URL } from "./constants";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const isNotEmpty = (string: string | null | undefined) => {
  return !isEmpty(string);
};

export const isFrontmostBrowser = async () => {
  const frontmostApp = await getFrontmostApplication();
  const browsers = await getApplications(TEST_URL);
  const isFrontmostBrowser = browsers.find((browser) => browser.bundleId === frontmostApp.bundleId);
  return isFrontmostBrowser;
};
