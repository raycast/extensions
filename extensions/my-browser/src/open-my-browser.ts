import { getDefaultApplication, showHUD, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";

export default async function Command() {
  try {
    const browser = await getDefaultApplication("https://raycast.com");
    execSync(`open -a "${browser.path}"`);
    await showHUD(`Opened ${browser.name}`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open browser",
      message: String(error),
    });
  }
}
