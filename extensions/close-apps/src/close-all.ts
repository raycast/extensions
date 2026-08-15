import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { closeNotWhitelisted } from "./scripts";

export default async function () {
  try {
    await closeNotWhitelisted();
    showHUD("Closing all apps not whitelisted");
    // console.log('res:', res)
    // await showHUD(res);
  } catch (error) {
    showFailureToast(error, { title: "Could not run AppleScript" });
  }
}
