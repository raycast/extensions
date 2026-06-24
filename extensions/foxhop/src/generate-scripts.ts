import { open, showToast, Toast } from "@raycast/api";
import { syncScripts } from "./foxhop";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Generating hotkey scripts…",
  });
  try {
    const { written, dir } = await syncScripts();
    toast.style = Toast.Style.Success;
    toast.title = `Generated ${written} hotkey script${written === 1 ? "" : "s"}`;
    toast.message = dir;
    toast.primaryAction = { title: "Open Folder", onAction: () => open(dir) };
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Sync failed";
    toast.message = String(err);
  }
}
