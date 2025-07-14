import { getFrontmostApplication, showToast, Toast } from "@raycast/api";
import { launchNewInstance } from "./utils";

export default async function Command() {
  try {
    // Get the currently active application
    const frontmostApp = await getFrontmostApplication();

    // Launch new instance using shared utility
    await launchNewInstance(frontmostApp);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not find current application",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
