import { showFailureToast } from "@raycast/utils";
import { openRecordistWithHUD } from "./lib/app";

export default async function Command() {
  try {
    await openRecordistWithHUD();
  } catch (error) {
    await showFailureToast(error, { title: "Could not open Recordist" });
  }
}
