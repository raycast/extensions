import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { launchPeople } from "./people-client";

export default async function OpenPeople() {
  try {
    await launchPeople();
    await closeMainWindow();
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open People",
      message: "Install People from the Mac App Store, then try again.",
    });
  }
}
