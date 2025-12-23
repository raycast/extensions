import { showToast, Toast } from "@raycast/api";
import { formatMiseError, updatePlugins } from "./tools/mise";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating plugins..." });
  try {
    await updatePlugins();
    toast.style = Toast.Style.Success;
    toast.title = "Plugins updated successfully";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to update plugins";
    toast.message = formatMiseError(error);
  }
}
