import { withCache } from "@raycast/utils";

import fetch from "./fetch";

import type { Paginated, Recipient } from "./types";

// @see https://app.addy.io/docs/#recipients-GETapi-v1-recipients
const getAll = withCache(
  async () => {
    const response = await fetch("recipients?filter[verified]=true");

    if (response.status !== 200) {
      throw new Error(`Failed to fetch recipients: ${response.status}`);
    }

    const body = (await response.json()) as Paginated<Recipient>;

    return body.data;
  },
  // Cache for 5 minutes
  { maxAge: 5 * 60 * 1000 },
);

export { getAll };
