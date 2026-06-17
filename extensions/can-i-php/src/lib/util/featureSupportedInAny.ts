import { Feature } from "../types/feature";
import { featureSupportedIn } from "./featureSupportedIn";

export function featureSupportedInAny(feature: Feature, versions: string[]) {
  for (const version of versions) {
    if (featureSupportedIn(feature, version)) {
      return true;
    }
  }

  return false;
}
