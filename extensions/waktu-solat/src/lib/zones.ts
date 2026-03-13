import { parse } from "node-html-parser";
import fetch from "node-fetch";
import { LocalStorage } from "@raycast/api";

export interface Zone {
  id: string;
  name: string;
  state: string;
}

export async function extractZones(): Promise<Zone[] | undefined> {
  const url = "https://www.e-solat.gov.my/index.php?siteId=24&pageId=24#";
  const response = await fetch(url);

  try {
    const dom = parse(await response.text());

    return dom
      .querySelectorAll("select#inputZone>optgroup>option")
      .map((z) => {
        const name = z.textContent.trim();
        const id = z.getAttribute("value") || "";
        const state = z.closest("optgroup")?.getAttribute("label") || "";
        return { id, name, state };
      })
      .filter(({ id, name }) => !!id && !!name);
  } catch (error: any) {
    console.error("Error:", error.message);
  }
  return;
}

export async function loadZones(): Promise<Zone[] | undefined> {
  const ZONES_KEY = "zones";
  const raw = await LocalStorage.getItem(ZONES_KEY);
  if (raw) {
    try {
      return JSON.parse(raw as string);
    } catch (e) {
      console.error("unable to parse zones", e);
      // noinspection ES6MissingAwait
      LocalStorage.removeItem(ZONES_KEY);
    }
  }
  const res = await extractZones();
  if (res) {
    // noinspection ES6MissingAwait
    LocalStorage.setItem(ZONES_KEY, JSON.stringify(res));
    return res;
  }
}
