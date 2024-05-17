import fetch from "node-fetch";
import { showToast, Toast } from "@raycast/api";
import { MatchedStop, Arrival } from "../models";

export async function fetchData<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return (await response.json()) as T;
    } else {
      showToast(Toast.Style.Failure, "Network Error", `Failed to fetch data from ${url}`);
      return null;
    }
  } catch (error) {
    console.error("Network error:", error);
    showToast(Toast.Style.Failure, "Network Error", "An error occurred while fetching data");
    return null;
  }
}

export async function fetchArrivalData(selectedItems: MatchedStop[]): Promise<Arrival[]> {
  const arrivals: Arrival[] = [];
  for (const item of selectedItems) {
    const data = await fetchData<Arrival[]>(`https://api.tfl.gov.uk/StopPoint/${item.id}/Arrivals`);
    if (data) {
      arrivals.push(...data);
    }
  }
  return arrivals;
}
