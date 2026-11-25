import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { makeNewTab } from "./cra";

const url = "https://crabrowser.app/release-notes";

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewTab(url);
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening the Cra release notes" });
  }
}
