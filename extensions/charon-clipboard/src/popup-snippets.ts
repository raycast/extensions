import { showFailureToast } from "@raycast/utils";
import { popup } from "./lib/bridge";

export default async function Command() {
  try {
    await popup("snippets");
  } catch (error) {
    await showFailureToast(error, { title: "Could not show the menu" });
  }
}
