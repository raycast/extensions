import { homedir } from "os";
import path from "path";

import { FeatureStatus } from "caniuse-lite";

export const statusToName: Record<FeatureStatus, string> = {
  ls: "WHATWG living standard",
  rec: "W3C recommendation",
  pr: "W3C proposed recommendation",
  cr: "W3C candidate recommendation",
  wd: "W3C working draft",
  other: "Non-W3C, but reputable",
  unoff: "Unofficial",
};

export function resolvePath(pathName: string): string {
  if (pathName.length > 0 && pathName.startsWith("~")) {
    return path.join(homedir(), pathName.slice(1));
  }

  return pathName;
}

export function getCanIUseLink(feature: string) {
  return `https://caniuse.com/${feature}`;
}
