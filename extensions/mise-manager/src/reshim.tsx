import { showToast, Toast } from "@raycast/api";
import { formatMiseError, reshim } from "./tools/mise";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Reshimming..." });
  try {
    await reshim();
    toast.style = Toast.Style.Success;
    toast.title = "Reshim complete";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to reshim";
    toast.message = formatMiseError(error);
  }
}
