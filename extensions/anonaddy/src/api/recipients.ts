import { withCache } from "@raycast/utils";

import fetch from "./fetch";

import type { Paginated, Recipient } from "./types";

// @see https://app.addy.io/docs/#recipients-GETapi-v1-recipients
const getAll = withCache(
  async () => {
    const response = await fetch<Paginated<Recipient>>("recipients?filter[verified]=true");

    return response.data;
  },
  // Cache for 5 minutes
  { maxAge: 5 * 60 * 1000 },
);

export { getAll };
