import { captureException, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  const url = "https://router.vuejs.org/";

  try {
    await open(url);
  } catch (error) {
    captureException(error);
    await showFailureToast(`Could not open ${url}.`);
  }
}
