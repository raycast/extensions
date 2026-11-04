import { showToast, Toast } from "@raycast/api";
import { type Airline, listAirlines } from "soaring-symbols";
import { AIRLINES_URL } from "./airlines";

// The latest airlines of the extension's release line, or the list bundled
// with the extension when that can't be loaded (offline, CDN error), so the
// commands always have something to show
export const fetchAirlines = async (): Promise<Airline[]> => {
  try {
    const res = await fetch(AIRLINES_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data.every((a) => a?.slug && a.assets)) {
      throw new Error("Unexpected airlines.json shape");
    }

    return data as Airline[];
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Showing the bundled airline list",
      message: `Couldn't load the latest one: ${String(error)}`,
    });

    return listAirlines();
  }
};

export const getSVGContent = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch SVG");

  return res.text();
};
