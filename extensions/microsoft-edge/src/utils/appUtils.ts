import { ApplicationType } from "../types/enums";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/interfaces";

const { useDev } = getPreferenceValues<Preferences>();
const { buildChoice } = getPreferenceValues<Preferences>();

export function getApplicationType() {
  switch (buildChoice) {
    case "dev":
      return ApplicationType.EdgeDev;
    case "canary":
      return ApplicationType.EdgeCanary;
    case "beta":
      return ApplicationType.EdgeBeta;
    default:
      return useDev ? ApplicationType.EdgeDev : ApplicationType.EdgeStable;
  }
}

export function getApplicationName(applicationType: ApplicationType = getApplicationType()) {
  switch (applicationType) {
    case ApplicationType.EdgeDev:
      return "Microsoft Edge Dev";
    case ApplicationType.EdgeBeta:
      return "Microsoft Edge Beta";
    case ApplicationType.EdgeCanary:
      return "Microsoft Edge Canary";
    case ApplicationType.EdgeStable:
    default:
      return "Microsoft Edge";
  }
}

export function isStableVersion(applicationType: ApplicationType = getApplicationType()) {
  return applicationType === ApplicationType.EdgeStable;
}

export function getApplicationImage(applicationType: ApplicationType = getApplicationType()) {
  switch (applicationType) {
    case ApplicationType.EdgeDev:
      return "edge-dev.png";
    case ApplicationType.EdgeBeta:
      return "edge-beta.png";
    case ApplicationType.EdgeCanary:
      return "edge-canary.png";
    case ApplicationType.EdgeStable:
    default:
      return "edge-stable.png";
  }
}

// This depends on the buildChoice preference
export function getCurrentProfileCacheKey() {
  return `current-profile-${getApplicationType()}`;
}
