import { open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getSubscribeUrl } from "./api/substack";

export default async function Command() {
  try {
    await open(getSubscribeUrl());
    await showHUD("Opening Raycast Weekly subscription page...");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open subscription page" });
  }
}
