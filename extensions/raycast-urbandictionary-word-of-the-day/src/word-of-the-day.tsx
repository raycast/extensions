import { environment, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import fetch from "node-fetch";

export default async function command() {

  // Fetch word of the day from urban dictionary
  const response = await fetch("https://api.urbandictionary.com/v0/words_of_the_day");
  const json = await response.json();
  // @ts-ignore
  const wordOfTheDay = json.list[0];
  const title = wordOfTheDay.word;
  let subtitle = wordOfTheDay.definition;
  subtitle = subtitle.replaceAll("[", "").replaceAll("]", "");

  updateCommandMetadata({ subtitle: title });

  if (environment.launchType === LaunchType.UserInitiated) {
    await showToast({
      style: Toast.Style.Success,
      title: "Refreshed",
      message: title,
    });
  }
}