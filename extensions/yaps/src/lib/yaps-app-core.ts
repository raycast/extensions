import { isAbsolute } from "node:path";

export const YAPS_BUNDLE_ID = "com.yaps.app";
export const YAPS_SETAPP_BUNDLE_ID = "com.yaps.app-setapp";

export interface InstalledApplication {
  bundleId?: string;
  name: string;
  path: string;
}

export function selectYapsApplication(
  applications: InstalledApplication[],
): InstalledApplication | undefined {
  const usableApplications = applications.filter(isUsableApplication);
  return (
    selectDeterministically(
      usableApplications,
      (application) =>
        application.bundleId === YAPS_BUNDLE_ID || application.bundleId === YAPS_SETAPP_BUNDLE_ID,
    ) ??
    selectDeterministically(
      usableApplications,
      (application) => application.name.trim().toLowerCase() === "yaps",
    )
  );
}

function isUsableApplication(application: InstalledApplication): boolean {
  return Boolean(
    application &&
    typeof application.name === "string" &&
    typeof application.path === "string" &&
    application.name.trim() &&
    isAbsolute(application.path) &&
    application.path !== "/",
  );
}

function selectDeterministically(
  applications: InstalledApplication[],
  predicate: (application: InstalledApplication) => boolean,
): InstalledApplication | undefined {
  return applications
    .filter(predicate)
    .slice()
    .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))[0];
}
