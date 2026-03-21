import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runMole } from "./utils/mole";

export default async function UpdateMole() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating Mole..." });
  try {
    const output = await runMole(["update"], { timeout: 60000 });
    toast.style = Toast.Style.Success;
    toast.title = output.includes("already") ? "Already up to date" : "Mole updated successfully";
  } catch (err) {
    await showFailureToast(err, { title: "Update failed" });
  }
}
