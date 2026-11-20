import { environment, getPreferenceValues } from "@raycast/api";
import { mountainPanel, outlookChart, singlePanel, type Column } from "./charts";
import { flag } from "./flags";
import type { ResortForecast } from "./forecast";
import type { Resort } from "../types";

export const ATTRIBUTION =
  "Weather data by [Open-Meteo.com](https://open-meteo.com/). Resort data from [OpenSkiData](https://openskidata.org/) / [OpenSkiMap.org](https://openskimap.org/), © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), [Skimap.org](https://skimap.org/), [Who's On First](https://whosonfirst.org/), © [Mapterhorn](https://mapterhorn.com/attribution).";

/** Base and summit side by side, never averaged. */
function columnsFor(forecast: ResortForecast): Column[] {
  return forecast.kind === "split"
    ? [
        { title: "Base", color: "base", point: forecast.base },
        { title: "Summit", color: "summit", point: forecast.summit },
      ]
    : [{ title: "Model terrain", color: "summit", point: forecast.point }];
}

/** "whistlerblackcomb.com" from a full URL, for a readable link. */
function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Building the graphic is the slow part of a render, so each forecast keeps its last markdown. Anything else
// the markdown depends on goes in the key, so a theme, units or resort edit rebuilds it.
const built = new WeakMap<ResortForecast, { key: string; markdown: string }>();

export function resortMarkdown(
  resort: Resort,
  forecast: ResortForecast | undefined,
  status: { isLoading: boolean; error?: Error },
  favorite = false,
): string {
  if (!forecast) return buildMarkdown(resort, undefined, status, favorite);
  const units = getPreferenceValues<Preferences>().units;
  const key = JSON.stringify([resort, environment.appearance, units, favorite]);
  const hit = built.get(forecast);
  if (hit?.key === key) return hit.markdown;
  const markdown = buildMarkdown(resort, forecast, status, favorite);
  built.set(forecast, { key, markdown });
  return markdown;
}

function buildMarkdown(
  resort: Resort,
  forecast: ResortForecast | undefined,
  status: { isLoading: boolean; error?: Error },
  favorite: boolean,
): string {
  const place = [flag(resort.country), [resort.region, resort.country].filter(Boolean).join(", ")].join(" ");
  const parts = [
    favorite ? `## ${resort.name} ★` : `## ${resort.name}`,
    resort.website ? `${place}\u2003[${host(resort.website)}](${resort.website})` : place,
  ];

  if (forecast) {
    const columns = columnsFor(forecast);
    if (forecast.kind === "single") {
      parts.push(
        "_No base or summit elevation in OpenSkiData, so this is one forecast at the weather model's terrain height. Set elevations with **Edit Elevations** (⌘E)._",
      );
    }
    const panel =
      forecast.kind === "split" ? mountainPanel(forecast.base, forecast.summit, resort) : singlePanel(forecast.point);
    parts.push(panel, outlookChart(columns));
  } else if (status.error) {
    parts.push(`**Couldn't load the forecast:** ${status.error.message}`);
  } else {
    parts.push(status.isLoading ? "_Loading forecast…_" : "_Select to load the forecast._");
  }

  parts.push(`<sub>${ATTRIBUTION}</sub>`);
  return parts.join("\n\n");
}
