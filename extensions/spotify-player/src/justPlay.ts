import { showHUD, showToast, Toast } from "@raycast/api";
import { play } from "./api/play";
import { searchTracks } from "./api/searchTracks";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { trackTitle } from "./utils";

type Props = { arguments: { query: string } };

export default async function Command(props: Props) {
  const { query } = props.arguments;

  try {
    await setSpotifyClient();

    const response = await searchTracks(query, 1);
    const firstMatch = response?.tracks?.items[0];

    if (firstMatch) {
      await play({ uri: firstMatch.uri });
      await showHUD(`Playing ${trackTitle(firstMatch)}`);
    } else {
      await showToast(Toast.Style.Failure, `Track not found!`);
    }
  } catch (error) {
    console.error(error);
    await showToast(Toast.Style.Failure, `Error playing ${query} `);
  }
}
