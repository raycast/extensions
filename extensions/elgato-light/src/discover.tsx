import { showHUD, showToast, Toast } from "@raycast/api";
import { execute } from "./lib/cli";

export default async function Main() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Discovering lights…" });

  try {
    await execute(["--timeout", "15", "discover"]);
    await toast.hide();
    await showHUD("Lights discovered and cached.");
  } catch (error) {
    console.log(error);
    toast.style = Toast.Style.Failure;
    toast.title = "No lights found — check power and network.";
  }
}
