import { LocalStorage, Toast, showToast } from "@raycast/api";
import { getUpNextShows } from "./api/shows";

export default async function Command() {
  try {
    await LocalStorage.removeItem("upNextShows");
    await getUpNextShows();
  } catch (e) {
    showToast({
      title: "Error refreshing data",
      style: Toast.Style.Failure,
    });
  }
}
