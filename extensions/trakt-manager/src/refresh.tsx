import { LocalStorage, Toast, showToast } from "@raycast/api";
import { authorize } from "./lib/oauth";
import { getUpNextShows } from "./services/shows";

export default async function Command() {
  try {
    await authorize();
    await LocalStorage.removeItem("upNextShows");
    await getUpNextShows();
  } catch (e) {
    showToast({
      title: "Error refreshing data",
      style: Toast.Style.Failure,
    });
  }
}
