import { showToast, Toast } from "@raycast/api";
import { formatMiseError, updateMise } from "./tools/mise";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating mise..." });
  try {
    await updateMise();
    toast.style = Toast.Style.Success;
    toast.title = "Mise updated successfully";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to update mise";
    toast.message = formatMiseError(error);
  }
}
