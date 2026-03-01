import { LaunchProps, showToast, Toast } from "@raycast/api";
import { createLink } from "./api";

export default async function SaveLink(props: LaunchProps<{ arguments: Arguments.SaveLink }>) {
  const { url, title } = props.arguments;

  if (!url.trim()) {
    await showToast(Toast.Style.Failure, "URL is required");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, "Saving link...");

  try {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const result = await createLink(normalizedUrl, title?.trim() || undefined);

    if (result.duplicate) {
      toast.style = Toast.Style.Success;
      toast.title = "Already saved";
      toast.message = "Bumped to top of inbox";
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Link saved";
      toast.message = normalizedUrl;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save";
    toast.message = String((error as Error).message || error);
  }
}
