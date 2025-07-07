import { useCachedPromise } from "@raycast/utils";
import { ListLinksResponse, ShortLink } from "../types/types";
import { LIST_LINK_API } from "../utils/constants";
import { apiKey } from "../types/preferences";
import axios from "axios";

export const useShortLinks = (domainId: string) => {
  return useCachedPromise((domainId) => {
    return getShortLinks(domainId) as Promise<ShortLink[]>;
  }, [domainId]);
};

const getShortLinks = async (domainId: string) => {
  if (!domainId) return [];
  const listLinksResponse = (
    await axios.get(LIST_LINK_API, {
      params: {
        domain_id: domainId,
        limit: "150",
        offset: "0",
      },
      headers: {
        accept: "application/json",
        authorization: apiKey,
      },
    })
  ).data as ListLinksResponse;
  return listLinksResponse.links;
};
