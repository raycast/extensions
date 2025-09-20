import { useCachedPromise } from "@raycast/utils";
import { ListLinksResponse, ShortLink } from "../types/types";
import { LIST_LINK_API } from "../utils/constants";
import { apiKey } from "../types/preferences";
import axios from "axios";
import { getDefaultDomain } from "../utils/common-utils";

export const useShortLinks = (domainId?: string) => {
  return useCachedPromise(
    (domainId?: string) => {
      return getShortLinks(domainId) as Promise<ShortLink[]>;
    },
    [domainId],
    {
      initialData: [],
    },
  );
};

const getShortLinks = async (domainId?: string) => {
  const id = domainId || (await getDefaultDomain())?.id;
  if (!id) return [];
  const listLinksResponse = (
    await axios.get(LIST_LINK_API, {
      params: {
        domain_id: id,
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
