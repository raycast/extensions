import { type LaunchProps, showToast, Toast } from "@raycast/api";
import { saveLink } from "./api";

type Arguments = {
  url: string;
  title?: string;
};

export default async function SaveLink(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { url, title } = props.arguments;

  if (!url.trim()) {
    await showToast(Toast.Style.Failure, "URL is required");
    return;
  }

  const toast = await showToast(Toast.Style.Animated, "Saving link...");

  try {
    const result = await saveLink({
      url,
      title,
      source: "raycast:save-link",
    });

    toast.style = Toast.Style.Success;
    toast.title = result.added ? "Link saved" : "Link updated";
    toast.message = result.normalizedUrl;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to save";
    toast.message = String((error as Error).message || error);
  }
}
