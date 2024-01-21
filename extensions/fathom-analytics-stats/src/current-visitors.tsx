import { getPreferenceValues, updateCommandMetadata } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  apiToken: string;
  siteId: string;
}

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

    const data: Data = await response.json();
    const { total } = data;
    return total.toLocaleString();
  } catch (error) {
    return null;
  }
}

export default async function Command() {
  const count = await fetchCurrentVisitorsCount();
  if (count) {
    await updateCommandMetadata({ subtitle: `${count} visitors` });
  }
}
