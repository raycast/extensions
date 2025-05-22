import { Feature } from "../types/feature";
import { versionCompare } from "./versionCompare";

export function featureSupportedIn(feature: Feature, version: string) {
  // Can't tell if feature is added
  if (feature.added === null) {
    return false;
  }

  // Feature is not yet added in this version
  if (versionCompare(feature.added, version) === 1) {
    return false;
  }

  // Feature is added, removal is not specified
  if (feature.removed === null) {
    return true;
  }

  // Feature is removed
  if (versionCompare(feature.removed, version) <= 0) {
    return false;
  }

  // Feature is added and not removed
  return true;
}
