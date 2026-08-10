import { open, showHUD } from "@raycast/api";
import { checkForScoreInstallation } from "./utils/utils";
import { FORSCORE_ACTIONS } from "./constants/constants";

export default async function Command() {
  if (!(await checkForScoreInstallation())) {
    return;
  }

  open(FORSCORE_ACTIONS.NEXT_PAGE);
  await showHUD("Next page");
}
