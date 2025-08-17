import { useCachedPromise } from "@raycast/utils";
import { Domain, SimpleDomain } from "../types/types";
import { DOMAINS_API } from "../utils/constants";
import axios from "axios";
import { apiKey } from "../types/preferences";
import { getDefaultDomain, saveDefaultDomain } from "../utils/common-utils";

export const useDefaultDomain = (defaultDomain: Domain | undefined) => {
  return useCachedPromise(
    (defaultDomain: Domain | undefined) => {
      return getDefaultDomains(defaultDomain) as Promise<SimpleDomain>;
    },
    [defaultDomain],
  );
};
const getDefaultDomains = async (defaultDomain: Domain | undefined) => {
  if (defaultDomain != undefined) {
    await saveDefaultDomain(defaultDomain);
    return { hostname: defaultDomain.hostname, id: -1 };
  }
  const stored = await getDefaultDomain();
  if (stored) return stored;
  const domainResponse = await axios.get(DOMAINS_API, {
    headers: {
      accept: "application/json",
      authorization: apiKey,
    },
  });
  const _domains = domainResponse.data as Domain[];
  if (_domains.length > 0) {
    await saveDefaultDomain(_domains[0]);
    return { hostname: _domains[0].hostname, id: _domains[0].id };
  } else {
    return undefined;
  }
};
