import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { describeOutcome, errorText, playRandom } from "./api";

export default async function Command() {
  try {
    await showHUD(describeOutcome(await playRandom()));
  } catch (e) {
    await showFailureToast(e, errorText(e));
  }
}
