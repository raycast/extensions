import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { applyLayout, getCurrentMacbookOrigin, loadConfig, type Layout, type SavedConfig } from "./lib";

function isConfigured(cfg: SavedConfig): cfg is Required<SavedConfig> {
  return Boolean(
    cfg.externalDisplayId && cfg.macbookDisplayId && cfg.macbookOriginSideBySide && cfg.macbookOriginUpAndDown,
  );
}

function pickNextLayout(currentOrigin: string | null, cfg: Required<SavedConfig>): Layout {
  if (currentOrigin === cfg.macbookOriginUpAndDown) return "side-by-side";
  if (currentOrigin === cfg.macbookOriginSideBySide) return "up-and-down";
  return "side-by-side";
}

export default async function Command() {
  const cfg = await loadConfig();
  if (!isConfigured(cfg)) {
    const toast = await showToast({
      style: Toast.Style.Failure,
      title: "Setup required",
      message: "Run Configure Displays first.",
    });
    toast.primaryAction = {
      title: "Open Configure Displays",
      onAction: () => launchCommand({ name: "configure-displays", type: LaunchType.UserInitiated }),
    };
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling arrangement…" });
  try {
    const currentOrigin = await getCurrentMacbookOrigin(cfg.macbookDisplayId);
    const next = pickNextLayout(currentOrigin, cfg);
    await applyLayout(next, cfg);
    toast.style = Toast.Style.Success;
    toast.title = next === "side-by-side" ? "Side-by-side" : "Up-and-down";
    toast.message =
      next === "side-by-side" ? "MacBook to the side, external main" : "External top, MacBook centered below";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to toggle arrangement";
    toast.message = /ENOENT|not found|No such file/i.test(message)
      ? "displayplacer not found. Install with `brew install displayplacer`."
      : message;
  }
}
