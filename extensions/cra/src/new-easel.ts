import { closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { makeNewEasel } from "./cra";

export default async function command() {
  try {
    await closeMainWindow();
    await makeNewEasel();
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening a new Easel" });
  }
}
