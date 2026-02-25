import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { connectToDisplay } from "./utils/connect";
import { getQuickConnectDisplay } from "./utils/displays";

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const storedName = await getQuickConnectDisplay();
  const displayName = storedName || prefs.displayName;

  if (!displayName) {
    await showToast({
      style: Toast.Style.Failure,
      title: "❌ Display not configured",
      message:
        'Use "Set as Quick Connect" in the display list, or set the name in extension preferences',
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "⏳ Connecting...",
    message: "Opening System Settings...",
  });

  try {
    const result = await connectToDisplay(displayName, (progress) => {
      if (progress.phase === "clicked" && progress.success) {
        toast.style = Toast.Style.Success;
        if (progress.connected) {
          toast.title = "🎯 Connected!";
          toast.message = `${displayName} • 🔊 Audio preserved`;
        } else {
          toast.title = "🔌 Disconnected";
          toast.message = displayName;
        }
      }
    });

    if (result.success && result.phase === "verified") {
      toast.style = Toast.Style.Success;
      if (result.connected) {
        toast.title = "✅ Connected";
        toast.message = `${displayName} • 🔊 Audio preserved`;
      } else {
        toast.title = "✅ Disconnected";
        toast.message = displayName;
      }
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "❌ Connection Failed";
    toast.message = String(error);
  }
}
