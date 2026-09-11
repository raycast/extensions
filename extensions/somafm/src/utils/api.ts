import { showFailureToast } from "@raycast/utils";
import { ChannelsResponse, Station } from "../types/station";

const SOMAFM_API_URL = "https://somafm.com/channels.json";

interface FetchStationsOptions {
  showErrorToast?: boolean;
}

export async function fetchStations(options: FetchStationsOptions = {}): Promise<Station[]> {
  try {
    const response = await fetch(SOMAFM_API_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch stations: ${response.statusText}`);
    }

    const data = (await response.json()) as ChannelsResponse;
    return data.channels;
  } catch (error) {
    if (options.showErrorToast !== false) {
      await showFailureToast(error instanceof Error ? error.message : "Unknown error occurred", {
        title: "Failed to fetch stations",
      });
    }
    return [];
  }
}
