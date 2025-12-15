import {
  open,
  getPreferenceValues,
  showToast,
  Toast,
  closeMainWindow,
} from "@raycast/api";
import path from "path";
import { ReadLaterEntry, loadJson } from "./utils";

interface Preferences {
  blogPath: string;
}

export default async function Command() {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const dataPath = path.join(
      preferences.blogPath,
      "data",
      "reading_list.json",
    );

    const list = loadJson<ReadLaterEntry>(dataPath);

    if (list.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Reading list is empty",
        message: "Add some articles to your reading list first!",
      });
      return;
    }

    const randomIndex = Math.floor(Math.random() * list.length);
    const randomArticle = list[randomIndex];

    await open(randomArticle.url);
    await closeMainWindow();

    await showToast({
      style: Toast.Style.Success,
      title: "Opened Random Article",
      message: randomArticle.title,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open random article",
      message: String(error),
    });
  }
}
