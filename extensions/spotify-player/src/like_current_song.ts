import { showHUD, showToast, Toast } from "@raycast/api";
import { likeCurrentlyPlayingTrack } from "./client/client";
import { isAuthorized } from "./client/oauth";

export default async () => {
  const authorized = await isAuthorized();
  if (!authorized) {
    showHUD("⚠️ Please open any view-based command and authorize to perform the command.");
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Liking Song" });
  try {
    const response = await likeCurrentlyPlayingTrack();
    if (response?.result) {
      const title = `${response.result.artist} – ${response.result.name}`;
      showHUD(`💚 ${title}`);
    } else if (response?.error) {
      toast.style = Toast.Style.Failure;
      toast.title = response.error;
    }
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to like the song";
    toast.message = (err as unknown as Error).message;
  }
};
