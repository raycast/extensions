import { showToast, Toast } from "@raycast/api";
import { runMole } from "./utils/mole";

export default async function UpdateMole() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating Mole..." });
  try {
    const output = await runMole(["update"], { timeout: 60000 });
    toast.style = Toast.Style.Success;
    toast.title = output.includes("already") ? "Already up to date" : "Mole updated successfully";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Update failed";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}
