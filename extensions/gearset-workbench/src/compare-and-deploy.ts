import { open, showHUD } from "@raycast/api";
import { GEARSET_COMPARE_DEPLOY_URL } from "./navigation";

export default async function CompareAndDeploy() {
  await open(GEARSET_COMPARE_DEPLOY_URL);
  await showHUD("Opening Gearset Compare & Deploy");
}
