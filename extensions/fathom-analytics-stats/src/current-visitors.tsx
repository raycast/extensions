import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import fetch from "node-fetch";

type Data = {
  total: number;
};

async function fetchCurrentVisitorsCount() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const response = await fetch(`https://api.usefathom.com/v1/current_visitors?site_id=${preferences.siteId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unable to fetch current visitors count");
    }

    const data = (await response.json()) as Data;
    const { total } = data;
    return total.toLocaleString();
  } catch (error) {
    return null;
  }
}

export default async function Command() {
  const count = await fetchCurrentVisitorsCount();
  if (count) {
    await updateCommandMetadata({ subtitle: `${count.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} visitors` });
  }
}
