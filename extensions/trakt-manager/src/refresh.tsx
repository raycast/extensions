import { LocalStorage } from "@raycast/api";
import { getUpNextShows } from "./services/shows";

export default async function Command() {
  await LocalStorage.removeItem("upNextShows");
  await getUpNextShows();
}
