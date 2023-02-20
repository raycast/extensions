import { environment, showToast, Toast } from "@raycast/api";
import _ from "lodash";
import { searchTracks, play } from "./spotify/client";
import { trackTitle } from "./utils";

type Props = { arguments: { query: string } };

export default async function Command(props: Props) {
  const response = await searchTracks(props.arguments.query, 1);
  const firstMatch = _(response.result?.tracks.items).first();
  if (firstMatch) {
    await play(firstMatch.uri);
    await showToast(Toast.Style.Success, `${environment.theme == "light" ? "🎵" : "♫"}  ${trackTitle(firstMatch)}`);
  } else {
    await showToast(Toast.Style.Failure, `Track is not found!`);
  }
}
