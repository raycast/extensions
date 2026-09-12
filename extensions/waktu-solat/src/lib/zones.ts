import { parse } from "node-html-parser";
import { fetchResource } from "./loaders";

export interface Zone {
  id: string;
  name: string;
  state: string;
}

export async function extractZones(): Promise<Zone[] | undefined> {
  const url = "https://www.e-solat.gov.my/index.php?siteId=24&pageId=24#";
  return fetchResource(url, "Unable to load prayer zones", async (response) => {
    const dom = parse(await response.text());
    const zoneOptions = dom.querySelector("select#inputZone")?.querySelectorAll(":scope > optgroup > option") ?? [];

    return zoneOptions
      .map((z) => ({
        id: z.getAttribute("value") || "",
        name: z.textContent.trim(),
        state: z.closest("optgroup")?.getAttribute("label") || "",
      }))
      .filter(({ id, name }) => !!id && !!name);
  });
}
