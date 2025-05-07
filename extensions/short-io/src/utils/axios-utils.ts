import axios from "axios";
import { SHORTEN_LINK_API } from "./constants";
import { ShortLink } from "../types/types";
import { isEmpty } from "./common-utils";
import { apiKey } from "../types/preferences";

export const shortenLinkWithSlug = async (domain: string, originalURL: string, slug: string, title: string) => {
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

    if (isEmpty(slug) && isEmpty(title)) {
      return { success: true, message: "", shortLink: shortLinkResponse.shortURL };
    } else {
      const data = isEmpty(slug)
        ? {
            allowDuplicates: false,
            title: title,
          }
        : isEmpty(title)
          ? {
              allowDuplicates: false,
              path: slug,
            }
          : {
              allowDuplicates: false,
              path: slug,
              title: title,
            };

      const options = {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: apiKey,
        },
      };

      return await axios
        .post(SHORTEN_LINK_API + "/" + shortLinkResponse.idString, data, options)
        .then(function (response) {
          if (isEmpty(response.data.error)) {
            return { success: true, message: "", shortLink: response.data.shortURL };
          } else {
            return { success: false, message: response.data.error, shortLink: shortLinkResponse.shortURL };
          }
        })
        .catch(function (response) {
          return { success: false, message: String(response), shortLink: shortLinkResponse.shortURL };
        });
    }
  } catch (e) {
    console.error(String(e));
    return { success: false, message: String(e), shortLink: "" };
  }
};

export const UpdateShortLink = async (linkId: string, originalURL: string, slug: string, title: string) => {
  try {
    const data = {
      allowDuplicates: false,
      originalURL: originalURL,
      path: slug,
      title: title,
    };

    const options = {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: apiKey,
      },
    };

    return await axios
      .post(SHORTEN_LINK_API + "/" + linkId, data, options)
      .then(function (response) {
        if (isEmpty(response.data.error)) {
          return { success: true, message: "", shortLink: response.data.shortURL };
        } else {
          return { success: false, message: response.data.error, shortLink: "" };
        }
      })
      .catch(function (response) {
        return { success: false, message: String(response), shortLink: "" };
      });
  } catch (e) {
    console.error(String(e));
    return { success: false, message: String(e) };
  }
};

export const deleteShortLink = async (linkId: string) => {
  console.log("deleteShortLink " + linkId);
  try {
    //shorten link
    return await axios({
      method: "DELETE",
      url: "https://api.short.io/links/" + linkId,
      headers: {
        authorization: apiKey,
      },
    })
      .then(function (response) {
        console.log(response);
        return { success: response.data, message: response.data ? "" : response.data.error };
      })
      .catch(function (response) {
        console.error(response);
        return { success: false, message: String(response) };
      });
  } catch (e) {
    console.error(String(e));
    return { success: false, message: String(e) };
  }
};
