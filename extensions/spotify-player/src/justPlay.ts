import { showHUD } from "@raycast/api";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { searchTracks } from "./api/searchTracks";
import { play } from "./api/play";
import { getErrorMessage } from "./helpers/getError";

type Props = { arguments: { query: string } };

export default async function Command(props: Props) {
  const { query } = props.arguments;
  await setSpotifyClient();

  try {
    const response = await searchTracks(query, 1);
    const firstMatch = response?.items?.[0] ?? undefined;

    if (firstMatch?.artists) {
      await play({ id: firstMatch.id, type: "track" });
      await showHUD(`Playing ${firstMatch.name} by ${firstMatch.artists[0].name}`);
    } else {
      await showHUD(`No results for ${query}`);
    }
  } catch (err) {
    const error = getErrorMessage(err);
    await showHUD(error);
  }
}
