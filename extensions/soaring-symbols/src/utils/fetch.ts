import { showToast, Toast } from "@raycast/api";
import { AirlineMeta } from "soaring-symbols";
import { normalizeFill } from ".";

export const fetchAirlines = async (): Promise<AirlineMeta[]> => {
  try {
    const res = await fetch("https://raw.githubusercontent.com/anhthang/soaring-symbols/refs/heads/main/airlines.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return (await res.json()) as AirlineMeta[];
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to load airlines",
      message: String(error),
    });

    return [];
  }
};

export const getSVGContent = async (url: string, monochrome: boolean = false) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch SVG");
  const svg = await res.text();

  return monochrome ? normalizeFill(svg) : svg;
};
