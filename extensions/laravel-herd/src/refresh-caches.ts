import { showToast, Toast } from "@raycast/api";
import { Herd } from "./utils/Herd";

export default async function main() {
  await showToast({
    title: "Refreshing Caches...",
    style: Toast.Style.Animated,
  });

  try {
    Herd.PHP.clearCache();
    Herd.Node.clearCache();
    Herd.Services.clearCache();
    Herd.Sites.clearCache();
  } catch (error) {
    await showToast({
      title: "Failed to refresh caches.",
      style: Toast.Style.Failure,
    });

    return;
  }

  await showToast({
    title: "Caches refreshed.",
    style: Toast.Style.Success,
  });
}
