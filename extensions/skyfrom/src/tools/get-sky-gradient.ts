import { resolveAiSky, type SkyInput } from "../lib/ai-sky";
import { countryName } from "../lib/locations";
import { type ExportFormat, formats, getExport, getSky, skyPage } from "../lib/skyfrom-api";

type Input = {
  /** Which city, favorite, and destination-local time to look up. Omit to use the saved default. */
  sky?: SkyInput;
  /** Format to export. Omit for the gradient's colors, time, and SkyFrom link. */
  format?: ExportFormat;
};

/** Get SkyFrom colors, destination-local time, and an optional CSS, Tailwind, SVG, JSON, Figma, or CSS variable export. */
export default async function tool({ format, sky: input = {} }: Input) {
  if (format !== undefined && !formats.includes(format)) throw new Error("Choose a supported gradient export format.");
  const sky = await resolveAiSky(input);
  const { value, stale } = await getSky(sky);
  const snapshot = { city: sky.city, local: value.local };

  const exported = format ? { format, content: await getExport(snapshot, format) } : undefined;

  return {
    city: sky.city.name,
    country: countryName(sky.city),
    timeZone: sky.city.tz,
    localTime: value.local,
    colors: value.colors,
    url: skyPage(snapshot),
    cached: stale,
    ...(exported && { export: exported }),
  };
}
