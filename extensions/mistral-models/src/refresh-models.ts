import { AI, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing Mistral models" });
  try {
    await AI.refreshModels();
    toast.style = Toast.Style.Success;
    toast.title = "Mistral models refreshed";
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: "Could not refresh Mistral models" });
  }
}
