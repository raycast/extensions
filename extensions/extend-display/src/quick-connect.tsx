import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { connectToDisplay } from "./utils/connect";

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();

  if (!prefs.displayName) {
    await showToast({
      style: Toast.Style.Failure,
      title: "❌ Display not configured",
      message: "Set your display name in extension preferences",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "⏳ Connecting...",
    message: "Opening System Settings...",
  });

  try {
    const result = await connectToDisplay(prefs.displayName, (progress) => {
      // Optimistic update after menu click completes (~2-3s)
      if (progress.phase === "clicked" && progress.success) {
        toast.style = Toast.Style.Success;
        if (progress.connected) {
          toast.title = "🎯 Connected!";
          toast.message = `${prefs.displayName} • 🔊 Audio preserved`;
        } else {
          toast.title = "🔌 Disconnected";
          toast.message = prefs.displayName;
        }
      }
    });

    // Verification complete - update with final confirmation
    if (result.success && result.phase === "verified") {
      toast.style = Toast.Style.Success;
      if (result.connected) {
        toast.title = "✅ Connected";
        toast.message = `${prefs.displayName} • 🔊 Audio preserved`;
      } else {
        toast.title = "✅ Disconnected";
        toast.message = prefs.displayName;
      }
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "❌ Connection Failed";
    toast.message = String(error);
  }
}
