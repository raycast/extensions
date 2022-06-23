import { showToast, Toast, Action } from "@raycast/api";
import { playSong } from "./client/spotify-applescript";

export function PlayAction(props: { itemURI: string }) {
  async function handleAction() {
    try {
      await playSong(props.itemURI);
    } catch (error: any) {
      showToast(
        Toast.Style.Failure,
        "Failed playing song",
        error instanceof Error ? error.message : (error as unknown as SpotifyApi.ErrorObject).message
      );
    }
  }

  return (
    <Action
      title="Play"
      icon={{ source: { light: "play-light.png", dark: "play-dark.png" } }}
      onAction={handleAction}
    />
  );
}
