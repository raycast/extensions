import { showToast, Toast, Action, Icon } from "@raycast/api";
import { playSong } from "./controls/spotify-applescript";

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

  return <Action title="Play" icon={Icon.Play} onAction={handleAction} />;
}
