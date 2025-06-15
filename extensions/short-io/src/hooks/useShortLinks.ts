import { useCachedPromise } from "@raycast/utils";
import { ListLinksResponse, ShortLink } from "../types/types";
import { LIST_LINK_API } from "../utils/constants";
import axios from "axios";
import { apiKey } from "../types/preferences";
import { getDefaultDomain } from "../utils/common-utils";

export const useShortLinks = () => {
  return useCachedPromise(() => {
    return getShortLinks() as Promise<ShortLink[]>;
  }, []);
};

const getShortLinks = async () => {
  const domain = await getDefaultDomain();
  if (domain != undefined) {
    const listLinksResponse = (
      await axios.get(LIST_LINK_API, {
        params: {
          domain_id: domain.id,
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
  } else {
    return [];
  }
};
