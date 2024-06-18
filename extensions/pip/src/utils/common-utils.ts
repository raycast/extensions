import { getApplications, getDefaultApplication, getFrontmostApplication } from "@raycast/api";
import { IINA, TEST_URL } from "./constants";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const isNotEmpty = (string: string | null | undefined) => {
  return !isEmpty(string);
};

export const getPipApp = async () => {
  const frontmostApp = await getFrontmostApplication();
  const browsers = await getApplications(TEST_URL);
  const iina = await getDefaultApplication(IINA);
  browsers.push(iina);
  const pipApp = browsers.find((browser) => browser.bundleId === frontmostApp.bundleId);
  return pipApp;
};
