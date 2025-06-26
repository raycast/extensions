import { showToast, Toast } from "@raycast/api";
import { ChannelsResponse, Station } from "../types/station";

const SOMAFM_API_URL = "https://somafm.com/channels.json";

export async function fetchStations(): Promise<Station[]> {
  try {
    const response = await fetch(SOMAFM_API_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch stations: ${response.statusText}`);
    }

    const data = (await response.json()) as ChannelsResponse;
    return data.channels;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch stations",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return [];
  }
}
