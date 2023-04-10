import { BrandedLink } from "./types";

import { getPreferenceValues } from "@raycast/api";
import fetch from "cross-fetch";
import { URLSearchParams } from "url";

export async function getLinks(lastId?: string): Promise<BrandedLink[]> {
  const query = new URLSearchParams({
    orderBy: "slashtag",
    orderDir: "asc",
  });

  // include last query to fetch next pagination
  if (lastId) query.set("last", lastId);

  // https://developers.rebrandly.com/docs/list-links
  const response = await fetch(`https://api.rebrandly.com/v1/links/?${query.toString()}`, {
    headers: { apiKey: getPreferenceValues().apiKey as string },
  });

  // throw if response status else than 200
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.json();
}
