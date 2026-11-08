import { getApplications, type Application } from "@raycast/api";

import { BlumeSearchClient } from "./helperProcessClient.ts";
import { helperLaunchForApplication } from "./helperLaunch.ts";

export { helperLaunchForApplication } from "./helperLaunch.ts";
export { BlumeSearchClient, SearchSupersededError } from "./helperProcessClient.ts";
export type { SearchInput } from "./helperProcessClient.ts";

const BLUME_BUNDLE_IDS = ["page.blume.sidecar", "page.blume.sidecar.canary"];
export async function resolveBlumeApplication(preferred?: Application): Promise<Application> {
  if (preferred) return preferred;
  const applications = await getApplications();
  const blume = applications
    .filter((application) => (application.bundleId ? BLUME_BUNDLE_IDS.includes(application.bundleId) : false))
    .sort(
      (left, right) => BLUME_BUNDLE_IDS.indexOf(left.bundleId ?? "") - BLUME_BUNDLE_IDS.indexOf(right.bundleId ?? ""),
    )[0];
  if (!blume) throw new Error("Install or update Blume before using Blume Search.");
  return blume;
}

export async function createBlumeSearchClient(preferred?: Application): Promise<BlumeSearchClient> {
  const application = await resolveBlumeApplication(preferred);
  const protocol = application.bundleId === "page.blume.sidecar.canary" ? "blume-canary" : "blume";
  const client = new BlumeSearchClient(helperLaunchForApplication(application), protocol);
  await client.ready();
  return client;
}
