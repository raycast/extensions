import { getDefaultApplication, showToast, Toast, open } from "@raycast/api";

export default async function Command() {
  try {
    const browser = await getDefaultApplication("https://raycast.com");
    await open(browser.path);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open browser",
      message: String(error),
    });
  }
}
