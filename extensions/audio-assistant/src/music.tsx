import { useEffect } from "react";
import { Detail, showToast, Toast } from "@raycast/api";
import { useShortcutSettings } from "./ui/use-shortcuts";
import { SessionRoute } from "./ui/session";
import { MusicBrowser } from "./ui/music-browser";

export default function Music() {
  const { ready, review, error } = useShortcutSettings();
  useEffect(() => {
    if (ready && (review || error))
      void showToast({
        style: error ? Toast.Style.Failure : Toast.Style.Success,
        title: error ? "Saved Shortcuts Unavailable" : "Review Your Keyboard Shortcuts",
        message:
          error ??
          `Shortcuts now live in Music. Open Keyboard Shortcuts with ${process.platform === "darwin" ? "Cmd" : "Ctrl"}+Shift+. to check existing custom bindings.`,
      });
  }, [ready, review, error]);
  if (!ready) return <Detail isLoading markdown="Loading shortcuts…" />;
  return (
    <SessionRoute>
      <MusicBrowser />
    </SessionRoute>
  );
}
