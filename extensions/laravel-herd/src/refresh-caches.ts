import { showToast, Toast } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  await showToast({
    title: "Refreshing Caches...",
    style: Toast.Style.Animated,
  });

  await rescue(() => Herd.PHP.clearCache(), "Failed to refresh PHP cache.");
  await rescue(() => Herd.Node.clearCache(), "Failed to refresh Node cache.");
  await rescue(() => Herd.Services.clearCache(), "Failed to refresh Services cache.");
  await rescue(() => Herd.Sites.clearCache(), "Failed to refresh Sites cache.");

  await showToast({
    title: "Caches refreshed.",
    style: Toast.Style.Success,
  });
}
