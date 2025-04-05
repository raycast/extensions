import { getPreferenceValues } from "@raycast/api";
import axios, { Axios, AxiosError } from "axios";
import { load } from "cheerio";
import { Agent } from "https";
import { GetLinkdingBookmarkResponse, PostLinkdingBookmarkPayload } from "../types/linkding-types";

class LinkdingApi {
  axios: Axios;

  constructor() {
    const { serverUrl, apiKey, ignoreSSL } = getPreferenceValues<Preferences>();
    this.axios = axios.create({
      baseURL: serverUrl,
      responseType: "json",
      httpsAgent: new Agent({ rejectUnauthorized: !ignoreSSL }),
      headers: { Authorization: `Token ${apiKey}` },
    });

    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const status = error.response?.status;
        let errorMessage = `Request failed with status ${status}`;

        const serverMessage = error.response?.data;
        if (serverMessage) {
          try {
            errorMessage += `\nServer response: ${JSON.stringify(serverMessage, null, 2)}`;
          } catch {
            errorMessage += `\nServer response: ${String(serverMessage)}`;
          }
        }

        errorMessage += `\nRequest: ${error.config?.method?.toUpperCase()} ${error.config?.url}`;
        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  getBookmarks() {
    return this.axios.get<GetLinkdingBookmarkResponse>("/api/bookmarks");
  }

  deleteBookmark(id: number) {
    return this.axios.delete(`/api/bookmarks/${id}`);
  }

  createBookmark(payload: PostLinkdingBookmarkPayload) {
    return this.axios.post("/api/bookmarks/", payload);
  }

  async getWebsiteMetadata(url: string) {
    const response = await this.axios.get(url);
    const $ = load(response.data);
    const title = $("title").text().trim();
    const description = $("meta[name='description']").attr("content")?.trim();
    return { title, description };
  }
}

const api = new LinkdingApi();
export default api;
