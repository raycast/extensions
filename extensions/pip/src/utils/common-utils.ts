import {
  Application,
  captureException,
  getApplications,
  getDefaultApplication,
  getFrontmostApplication,
} from "@raycast/api";
import { IINA, TEST_URL } from "./constants";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const isNotEmpty = (string: string | null | undefined) => {
  return !isEmpty(string);
};

export const getApps = async () => {
  const browsers: Application[] = [];
  try {
    const browsers_ = await getApplications(TEST_URL);
    browsers.push(...browsers_);
  } catch (e) {
    captureException(e);
    console.error(e);
  }
  try {
    const iina = await getDefaultApplication(IINA);
    browsers.push(iina);
  } catch (e) {
    console.error(e);
  }
  try {
    const frontmostApp = await getFrontmostApplication();
    const supportApp = browsers.find((browser) => browser.bundleId === frontmostApp.bundleId);
    return { frontmostApp: frontmostApp, supportApp: supportApp };
  } catch (e) {
    captureException(e);
    console.error(e);
    return { frontmostApp: undefined, supportApp: undefined };
  }
};
