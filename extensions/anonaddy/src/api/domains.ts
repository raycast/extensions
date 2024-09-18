import APIError from "./APIError";
import fetch from "./fetch";

type Options = {
  data: string[];
  sharedDomains: string[];
  defaultAliasDomain: string;
  defaultAliasFormat: string;
};

// @see https://app.addy.io/docs/#domain-options-GETapi-v1-domain-options
async function options(): Promise<Options> {
  const response = await fetch(`/domain-options`);

  if (response.status !== 200) {
    throw new APIError(response.status);
  }

  return (await response.json()) as Options;
}

export { options };
