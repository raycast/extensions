import { Cache, showToast, Toast } from "@raycast/api";
import { type Airline, type Alliance, listAirlines, listAlliances } from "soaring-symbols";
import {
  airlinesUrl,
  alliancesUrl,
  isAirlineList,
  isAllianceList,
  isLineRelease,
  RESOLVE_URL,
  setDataVersion,
} from "./airlines";

const cache = new Cache();
const VERSION_KEY = "data-version";

// Images load from the release the last list came from, so the list
// useCachedPromise shows at launch points at the right files
setDataVersion(cache.get(VERSION_KEY));

// The release the line points at now, or undefined when jsDelivr can't say.
// Asked once per launch: both lists load from the same release.
let resolving: Promise<string | undefined> | undefined;
const resolveRelease = () => (resolving ??= askRelease());

const askRelease = async (): Promise<string | undefined> => {
  try {
    const res = await fetch(RESOLVE_URL);
    if (!res.ok) return undefined;
    const { version } = (await res.json()) as { version?: unknown };

    return isLineRelease(version) ? version : undefined;
  } catch {
    return undefined;
  }
};

// The latest airlines of the extension's release line, read from that exact
// release, or the list bundled with the extension when that can't be loaded
// (offline, CDN error) or isn't a usable list (see isAirlineList), so the
// commands always have something to show
export const fetchAirlines = async (): Promise<Airline[]> => {
  try {
    const release = await resolveRelease();
    const res = await fetch(airlinesUrl(release));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!isAirlineList(data)) throw new Error("Unexpected airlines.json shape");

    setDataVersion(release);
    if (release) cache.set(VERSION_KEY, release);
    else cache.remove(VERSION_KEY);

    return data;
  } catch (error) {
    // The bundled list's files are in every release of the line
    setDataVersion();
    cache.remove(VERSION_KEY);
    await showToast({
      style: Toast.Style.Failure,
      title: "Showing the bundled airline list",
      message: `Couldn't load the latest one: ${String(error)}`,
    });

    return listAirlines();
  }
};

// The alliances of the same release, or the bundled list when they can't be
// loaded. Quietly: the airline list already says when the data is stale.
export const fetchAlliances = async (): Promise<Alliance[]> => {
  try {
    const release = await resolveRelease();
    const res = await fetch(alliancesUrl(release));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!isAllianceList(data)) throw new Error("Unexpected alliances.json shape");

    return data;
  } catch {
    return listAlliances();
  }
};

export const getSVGContent = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch SVG");

  return res.text();
};
