import axios, { AxiosRequestConfig } from "axios";
import { GetLinkdingBookmarkResponse, LinkdingAccount, PostLinkdingBookmarkPayload } from "../types/linkding-types";
import { Agent } from "https";
import { showErrorToast } from "../util/bookmark-util";
import { load } from "cheerio";

function createAxiosAgentConfig(linkdingAccount: LinkdingAccount): AxiosRequestConfig {
  return {
    responseType: "json",
    httpsAgent: new Agent({ rejectUnauthorized: !linkdingAccount.ignoreSSL }),
    headers: { Authorization: `Token ${linkdingAccount.apiKey}` },
  };
}

export function searchBookmarks(linkdingAccount: LinkdingAccount, searchText: string) {
  return axios<GetLinkdingBookmarkResponse>(
    `${linkdingAccount.serverUrl}/api/bookmarks?` + new URLSearchParams({ q: searchText }),
    {
      ...createAxiosAgentConfig(linkdingAccount),
    }
  );
}

export function deleteBookmark(linkdingAccount: LinkdingAccount, bookmarkId: number) {
  return axios.delete(`${linkdingAccount.serverUrl}/api/bookmarks/${bookmarkId}`, {
    ...createAxiosAgentConfig(linkdingAccount),
  });
}

export function createBookmark(linkdingAccount: LinkdingAccount, bookmark: PostLinkdingBookmarkPayload) {
  return axios.post(`${linkdingAccount.serverUrl}/api/bookmarks/`, bookmark, {
    ...createAxiosAgentConfig(linkdingAccount),
  });
}

export function getWebsiteMetadata(url: string) {
  return axios
    .get(url)
    .then((response) => {
      const $ = load(response.data);
      const title = $("title").text().trim();
      const description = $("meta[name='description']").attr("content")?.trim();
      return { title, description };
    })
    .catch(showErrorToast);
}
