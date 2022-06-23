import axios from "axios";
import { SHORTEN_LINK_API } from "./constants";
import { apiKey } from "../hooks/hooks";
import { ShortLink } from "../types/types";
import { isEmpty } from "./common-utils";

export const shortenLinkWithSlug = async (domain: string, originalURL: string, slug: string) => {
  try {
    //shorten link
    const shortLinkResponse = (
      await axios({
        method: "POST",
        url: SHORTEN_LINK_API,
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
        data: {
          domain: domain,
          originalURL: originalURL,
        },
      })
    ).data as ShortLink;

    if (isEmpty(slug)) {
      return { success: true, message: "", shortLink: shortLinkResponse.shortURL };
    } else {
      const data = {
        allowDuplicates: false,
        path: slug,
      };

      const options = {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: apiKey,
        },
      };

      const updateShortLinkResponse = (
        await axios.post(SHORTEN_LINK_API + "/" + shortLinkResponse.idString, data, options)
      ).data as ShortLink;
      return { success: true, message: "", shortLink: updateShortLinkResponse.shortURL };
    }
  } catch (e) {
    console.error(String(e));
    return { success: false, message: String(e), shortLink: "" };
  }
};
