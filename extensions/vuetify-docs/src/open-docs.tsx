import { open, captureException } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  const url = "https://vuetifyjs.com/en/";
  try {
    await open(url);
  } catch (e: unknown) {
    captureException(e);
    await showFailureToast(`Could not open ${url}.`);
  }
}
