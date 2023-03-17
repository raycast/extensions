import { showHUD, showToast, Toast } from "@raycast/api";
import { searchTracks } from "./api/searchTracks";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { play } from "./api/play";

type Props = { arguments: { query: string } };

export default async function Command(props: Props) {
  const { query } = props.arguments;

  try {
    await showToast(Toast.Style.Animated, "Searching");
    await setSpotifyClient();

    const response = await searchTracks(query, 1);
    const firstMatch = response?.tracks?.items[0];

    if (firstMatch) {
      await play({ id: firstMatch.id, type: "track" });
      await showHUD(`Playing ${firstMatch.artists[0].name} - ${firstMatch.name}`);
    } else {
      await showToast(Toast.Style.Failure, "Track not found!");
    }
  } catch (error) {
    console.error(error);
    await showToast(Toast.Style.Failure, `Error playing ${query} `);
  }
}
