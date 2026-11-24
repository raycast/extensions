import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { makeNewBlankWindow } from "./cra";

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewBlankWindow();
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening a new blank window" });
  }
}
