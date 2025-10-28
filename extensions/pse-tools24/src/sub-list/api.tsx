import { getPreferenceValues, LocalStorage } from "@raycast/api";
import xml2js from "xml2js";
import fetch from "node-fetch";

const CACHE_KEY = "sub_records_cache";
const COOKIE_KEY = "last_cookie_hash";

// Get current session cookie
const getCurrentCookie = () => {
  const prefs = getPreferenceValues();
  return prefs.sessCookie as string;
};

// Cache management functions
const getCachedSubRecords = async (): Promise<SubRecord[] | null> => {
  try {
    const cached = await LocalStorage.getItem<string>(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error("Failed to read cache:", error);
    return null;
  }
};

const setCachedSubRecords = async (records: SubRecord[]): Promise<void> => {
  try {
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Failed to write cache:", error);
  }
};

const getCookieHash = (cookie: string): string => {
  // Simple hash function for cookie comparison
  let hash = 0;
  for (let i = 0; i < cookie.length; i++) {
    const char = cookie.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

const hasCookieChanged = async (currentCookie: string): Promise<boolean> => {
  try {
    const lastCookieHash = await LocalStorage.getItem<string>(COOKIE_KEY);
    const currentHash = getCookieHash(currentCookie);

    if (!lastCookieHash) {
      await LocalStorage.setItem(COOKIE_KEY, currentHash);
      return true; // First time, consider it changed
    }

    if (lastCookieHash !== currentHash) {
      await LocalStorage.setItem(COOKIE_KEY, currentHash);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to check cookie change:", error);
    return true; // On error, assume changed to be safe
  }
};

// fetch XML from QMOPS
const fetchSubInfo = async (cookie: string) => {
  const fetchURL = "https://qmops2.quantummetric.com/ops/a_getinstlist.html";
  const fetchOptions = {
    headers: {
      cookie: `PHPSESSID=${cookie}`,
    },
  };
  return await fetch(fetchURL, fetchOptions).then(async (res) => {
    const result = await res.text();
    if (/<data>/.test(result)) {
      return result;
    }
  });
};

// parse XML to JSON
type RawJSON = {
  data: {
    msg: string[];
    record: {
      container: string[];
      instance: string[];
      imgTag: string[];
      string: string[];
    }[];
  };
};
const getRawJson = async (xmlStr: string): Promise<RawJSON> => {
  const parser = new xml2js.Parser();
  return await parser.parseStringPromise(xmlStr);
};

//Formats the rawJSON built by xml2js into an array of SubRecords
export type SubRecord = {
  [index: string]: string | boolean;
  server: string;
  instance: string;
  yml: string;
  container: string;
  procCount: string;
  imgTag: string;
  rProxy: boolean;
  smartSampling: boolean;
  wren: boolean;
  bigTable: boolean;
  vHost: string;
  horizon: boolean;
  instrumentation: string;
};
const getRecords = (rawJSON: RawJSON): SubRecord[] => {
  const baseRecords = rawJSON.data.record.filter((record) => /nodejs/.test(record.container[0]));
  const records = baseRecords.map((record) => {
    const finalObj = Object.fromEntries(
      Object.entries(record).map(([key, value]) => {
        if (value[0] == "false" || value[0] == "null" || !value[0]) {
          return [key, false];
        } else if (value[0] == "true") {
          return [key, true];
        }
        return [key, value[0]];
      }),
    );
    const recordContainers = rawJSON.data.record.filter((r) => r.instance[0] == finalObj.instance);
    finalObj.horizon = !!recordContainers.find((c) => /neutron/.test(c.imgTag[0]));
    return finalObj;
  });
  return records.sort((a, b) => (a.instance > b.instance ? 1 : -1));
};

//Consolidated function for fetching sub records from QMOPS and formatting into JS object
export const getSubRecords = async (forceRefresh: boolean = false) => {
  const currentCookie = getCurrentCookie();

  if (!currentCookie) {
    throw new Error("No session cookie found. Please set your PHPSESSID in preferences.");
  }

  // Check if we should use cache
  if (!forceRefresh) {
    const cookieChanged = await hasCookieChanged(currentCookie);

    if (!cookieChanged) {
      // Cookie hasn't changed, try to use cache
      const cachedRecords = await getCachedSubRecords();
      if (cachedRecords && cachedRecords.length > 0) {
        return cachedRecords;
      }
    }
  }

  // Fetch fresh data
  const xmlStr = await fetchSubInfo(currentCookie);
  if (!xmlStr) {
    // If fetch fails, try to return cached data as fallback
    const cachedRecords = await getCachedSubRecords();
    if (cachedRecords && cachedRecords.length > 0) {
      return cachedRecords;
    }
    return null;
  }

  const rawJSON = await getRawJson(xmlStr);
  const subRecords = getRecords(rawJSON);

  // Cache the fresh data
  await setCachedSubRecords(subRecords);

  return subRecords;
};

// Function to force refresh the sub records
export const refreshSubRecords = async () => {
  return await getSubRecords(true);
};

// Function to clear the cache
export const clearSubRecordsCache = async () => {
  try {
    await LocalStorage.removeItem(CACHE_KEY);
    await LocalStorage.removeItem(COOKIE_KEY);
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
};

// getSubInstrumentation
export const getInstrumentation = async (instance: string) => {
  return await fetch(`https://cdn.quantummetric.com/qscripts/quantum-${instance}.js`)
    .then((r) => r.text())
    .then((text) => {
      try {
        // Look for the eula hash - it's 40 characters long, not 8
        const eulaMatch = text.match(/eula \S+ (\w{40})/);
        // Look for version in quotes
        const versionMatch = text.match(/"(\d+\.\d+\.\d+)"/);

        if (!eulaMatch || !versionMatch) {
          // Try alternative patterns if the first ones don't work
          const altEulaMatch = text.match(/eula\s+(\w{40})/);
          const altVersionMatch = text.match(/version[:\s]+"?(\d+\.\d+\.\d+)"?/i);

          if (!altEulaMatch || !altVersionMatch) {
            // If still no match, return the first 8 characters of any 40-char hex string we find
            const anyHashMatch = text.match(/(\w{40})/);
            const anyVersionMatch = text.match(/(\d+\.\d+\.\d+)/);

            if (anyHashMatch && anyVersionMatch) {
              return anyVersionMatch[1] + " " + anyHashMatch[1].substring(0, 8);
            }

            return "Unable to parse instrumentation data";
          }

          const top = altEulaMatch[1];
          const version = altVersionMatch[1];
          return version + " " + top.substring(0, 8);
        }

        const top = eulaMatch[1];
        const version = versionMatch[1];
        return version + " " + top.substring(0, 8);
      } catch (e) {
        console.error(e);
        return "error";
      }
    });
};

// getSubConfig
// type EventDefinitions = {events: {[index: string]: boolean|string|number|object}[]}
type SubConfig = { [index: string]: string | object | object[] };
export const getConfig = async (sub: SubRecord): Promise<SubConfig | string> => {
  try {
    const subscription = sub.instance;
    const rawConfig = await fetch(`https://cdn.quantummetric.com/bootstrap/quantum-${subscription}.js`).then((r) =>
      r.text(),
    );
    const start = "Start(";
    const end = `"${subscription}"});`;
    const cstring = rawConfig.slice(rawConfig.indexOf(start) + start.length, rawConfig.indexOf(end) + (end.length - 2));
    return eval(`(${cstring})`);
  } catch (error) {
    return "Could not fetch config";
  }
};
