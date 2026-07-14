import { getDefaultApplication, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const browser = await getDefaultApplication("https://raycast.com");
    await open(browser.path);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open browser" });
  }
}
