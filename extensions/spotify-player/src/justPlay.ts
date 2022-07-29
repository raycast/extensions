import { environment, showToast, Toast } from "@raycast/api";
import _ from "lodash";
import { searchTracks } from "./client/client";
import { playSong } from "./controls/spotify-applescript";
import { trackTitle } from "./client/utils";

export default async function Main(props: { arguments: { query: string } }) {
  const response = await searchTracks(props.arguments.query, 1);
  const firstMatch = _(response.result?.tracks.items).first();
  if (firstMatch) {
    await playSong(firstMatch.uri);
    await showToast(Toast.Style.Success, `${environment.theme == "light" ? "🎵" : "♫"}  ${trackTitle(firstMatch)}`);
  } else {
    await showToast(Toast.Style.Failure, `Track is not found!`);
  }
}
