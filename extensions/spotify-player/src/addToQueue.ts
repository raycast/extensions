import { showHUD } from "@raycast/api";
import { searchTracks } from "./api/searchTracks";
import { setSpotifyClient } from "./helpers/withSpotifyClient";
import { addToQueue } from "./api/addTrackToQueue";
import { getErrorMessage } from "./helpers/getError";

type Props = { arguments: { query: string } };

export default async function Command(props: Props) {
  const { query } = props.arguments;

  await setSpotifyClient();

  try {
    const response = await searchTracks(query, 1);
    const firstMatch = response?.items?.[0] ?? undefined;

    if (firstMatch?.uri) {
      await addToQueue({ uri: firstMatch.uri });
      await showHUD(`Added ${firstMatch.name} by ${firstMatch?.artists?.[0].name} to the queue.`);
    } else {
      await showHUD(`No results for ${query}`);
    }
  } catch (err) {
    const error = getErrorMessage(err);
    await showHUD(error);
  }
}
