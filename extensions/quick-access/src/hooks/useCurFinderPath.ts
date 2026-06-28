import { usePromise } from "@raycast/utils";
import { getFrontmostApplication } from "@raycast/api";
import { getFinderInsertLocation } from "../utils/applescript-utils";

async function getCurFinderPath() {
  try {
    const finderBundleId = "com.apple.finder";
    const frontmostApp = await getFrontmostApplication();
    if (frontmostApp.bundleId === finderBundleId) {
      // get finder path
      return await getFinderInsertLocation();
    }
  } catch (e) {
    return "";
  }
}

export function useCurFinderPath() {
  return usePromise(() => {
    return getCurFinderPath();
  }, []);
}
