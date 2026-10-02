import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { glimpse } from "./glimpse";

export default async function Command() {
  try {
    await glimpse(["record", "bookmark"]);
    await showHUD("Bookmark added");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't add bookmark" });
  }
}
