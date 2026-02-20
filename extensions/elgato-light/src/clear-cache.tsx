import { showToast, Toast } from "@raycast/api";
import { execute } from "./lib/cli";

export default async function Main() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Clearing light cache…" });

  try {
    await execute(["clear-cache"]);
    toast.style = Toast.Style.Success;
    toast.title = "Light cache cleared.";
  } catch (error) {
    console.log(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Error clearing light cache.";
  }
}
