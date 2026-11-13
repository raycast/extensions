import { Clipboard, closeMainWindow, environment, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseBusyEvents } from "./lib/ics";
import { normalizeUrl, toOptions } from "./lib/options";
import { buildPlan, rangeFor } from "./lib/plan";
import { svgToPng } from "./lib/png";
import { renderSvg } from "./lib/render";

const FETCH_TIMEOUT_MS = 15000;
const COPY_PNG_SCRIPT = `
on run argv
  set the clipboard to (read (POSIX file (item 1 of argv)) as «class PNGf»)
end run`;

export default async function main() {
  const prefs = getPreferenceValues<Preferences>();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Loading calendar…" });

  try {
    const opts = toOptions(prefs);
    const now = new Date();
    const { start, end } = rangeFor(now, opts);

    const ics = await fetchIcs(normalizeUrl(prefs.icsUrl));

    if (!ics.includes("BEGIN:VCALENDAR")) throw new Error("The response is not an ICS calendar. Is the link correct?");

    const events = parseBusyEvents(ics, start, end);
    const weeks = buildPlan(events, now, opts);
    const { svg } = renderSvg(weeks, now, opts);
    const png = await svgToPng(svg, environment.assetsPath);

    mkdirSync(environment.supportPath, { recursive: true });

    const file = join(environment.supportPath, "availability.png");
    writeFileSync(file, png);

    await copyImage(file);

    const slots = weeks.flat().reduce((n, d) => n + d.free.length, 0);

    await closeMainWindow();
    await showHUD(`Copied availability image · ${slots} free ${slots === 1 ? "slot" : "slots"}`);
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not create availability image";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

async function fetchIcs(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/calendar" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Could not fetch the ICS calendar (HTTP ${res.status}).`);
    return await res.text();
  } catch (err) {
    // The timeout covers the headers and the body, so it can also fire while reading the response.
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(`The calendar server did not respond within ${FETCH_TIMEOUT_MS / 1000} seconds.`);
    }
    throw err;
  }
}

/**
 * Puts raw PNG data on the clipboard so pasting also works in web text fields.
 * Falls back to copying the file, which native apps still paste as an image.
 */
async function copyImage(file: string) {
  try {
    await runAppleScript(COPY_PNG_SCRIPT, [file]);
  } catch {
    await Clipboard.copy({ file });
  }
}
