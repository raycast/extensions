import { getFrontmostApplication } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { launchNewInstance } from "./utils";

export default async function Command() {
  try {
    // Get the currently active application
    const frontmostApp = await getFrontmostApplication();

    // Launch new instance using shared utility
    await launchNewInstance(frontmostApp);
  } catch (error) {
    // getFrontmostApplication() throws an error if no application is open
    await showFailureToast(error, { title: "Could not find current application" });
  }
}
