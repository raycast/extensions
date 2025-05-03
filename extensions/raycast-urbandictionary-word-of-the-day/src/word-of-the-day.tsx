import { environment, LaunchType, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import fetch from "node-fetch";

type DefintionList = {
  list: [
    {
      word: string;
      definition: string;
    }
  ];
};

export default async function command() {
  // Fetch word of the day from urban dictionary
  const response = await fetch("https://api.urbandictionary.com/v0/words_of_the_day");
  const jsondata = (await response.json()) as DefintionList;
  const wordOfTheDay = jsondata.list[0];
  const title = wordOfTheDay.word;

  updateCommandMetadata({ subtitle: title });

  if (environment.launchType === LaunchType.UserInitiated) {
    await showToast({
      style: Toast.Style.Success,
      title: "Refreshed",
      message: title,
    });
  }
}
