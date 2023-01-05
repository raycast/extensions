import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

async function getQueue() {
  const url = "https://web.getmatter.com/api/library_items/queue_feed?page=1";
  const token = getPreferenceValues<Preferences>().matterToken;
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.log(error);
  }
}

export { getQueue };
