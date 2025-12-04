import fetch from "./fetch";

import type { Options } from "./types";

// @see https://app.addy.io/docs/#domain-options-GETapi-v1-domain-options
async function options() {
  const response = await fetch("domain-options");

  if (response.status !== 200) {
    throw new Error(`Failed to fetch domain options: ${response.status}`);
  }

  return (await response.json()) as Options;
}

export { options };
