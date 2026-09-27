import { AI, showToast, Toast } from "@raycast/api";

export default async function command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing Mistral models" });
  try {
    await AI.refreshModels();
    toast.style = Toast.Style.Success;
    toast.title = "Mistral models refreshed";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not refresh Mistral models";
    toast.message = error instanceof Error ? error.message : "Try again from the AI model picker.";
  }
}
