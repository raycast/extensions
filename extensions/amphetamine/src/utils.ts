import { getApplications } from "@raycast/api";

export async function checkIfAmphetamineInstalled() {
  const apps = await getApplications();
  const amphetamineInstalled = apps.find((app) => app.bundleId === "com.if.Amphetamine");
  if (amphetamineInstalled) return true;

  return false;
}

export const AMPHETAMINE_DOWNLOAD_URL = "https://apps.apple.com/br/app/amphetamine/id937984704";
