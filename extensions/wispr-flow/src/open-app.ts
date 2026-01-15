import { open } from "@raycast/api";
import { WISPR_FLOW_BUNDLE_ID, checkOnboardingAndInstallation } from "./utils";

export default async function main() {
  const canProceed = await checkOnboardingAndInstallation();
  if (!canProceed) {
    return;
  }
  await open("wispr-flow://open", WISPR_FLOW_BUNDLE_ID);
}
