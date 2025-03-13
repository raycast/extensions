import { open, captureException, showToast, Toast } from "@raycast/api";

export default async function Command() {
  const url = "https://vuetifyjs.com/en/";
  try {
    await open(url);
  } catch (e: unknown) {
    captureException(e);
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open ${url}.`,
    });
  }
}
