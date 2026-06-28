import { Adapter } from "./@types/global";
import { searchToClipboard } from "./shared/searchToClipboard";

export default async function () {
  await searchToClipboard(Adapter.Spotify);
}
