import { withCache } from "@raycast/utils";

import fetch from "./fetch";

import type { Options } from "./types";

// @see https://app.addy.io/docs/#domain-options-GETapi-v1-domain-options
const options = withCache(
  async () => {
    return fetch<Options>("domain-options");
  },
  // Cache for 5 minutes
  { maxAge: 5 * 60 * 1000 },
);

export { options };
