import { Application } from "@raycast/api";
import { getDeclaredExtensions } from "swift:../../swift";
import { DiscoveredExts } from "./storage";

export function appsSignature(apps: Application[]): string {
  const ids = apps.map((a) => a.bundleId).filter((b): b is string => !!b);
  ids.sort();
  return `${ids.length}:${ids.join("|")}`;
}

export async function runDiscovery(apps: Application[]): Promise<DiscoveredExts> {
  const paths = apps.map((a) => a.path);
  const exts = (await getDeclaredExtensions(paths)) as string[];
  return {
    exts,
    signature: appsSignature(apps),
    computedAt: Date.now(),
  };
}
