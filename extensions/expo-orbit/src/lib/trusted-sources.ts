import { z } from "zod";
import { runOrbit } from "./orbit";
import { getTrustedSources } from "./settings";

const sourcesSchema = z.array(z.string());

/**
 * The CLI checks build and update URLs against the trusted sources saved in Expo Orbit's settings. Adds the
 * sources from the extension preferences to that list, so a URL you trust here opens. Never removes any.
 */
export async function syncTrustedSources(): Promise<void> {
  const wanted = getTrustedSources();
  if (wanted.length === 0) return;

  const current = parseSources(await runOrbit("get-custom-trusted-sources"));
  const missing = wanted.filter((source) => !current.includes(source));
  if (missing.length === 0) return;

  await runOrbit("set-custom-trusted-sources", [[...current, ...missing].join(",")]);
}

function parseSources(output: string): string[] {
  try {
    return sourcesSchema.catch([]).parse(JSON.parse(output || "[]"));
  } catch {
    return [];
  }
}
