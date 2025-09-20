import fetch, { AbortError } from "node-fetch";
import { URLSearchParams } from "url";
import { SearchResult } from "../types";
import { WeChatManager } from "../utils/wechatManager";
import { wechatService } from "./wechatService";

const SEARCHURL = "http://localhost:48065/wechat/search";

class ContactService {
  async searchContacts(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
    const params = new URLSearchParams();
    params.append("keyword", searchText);
    params.append("usePinyin", "1");
    params.append("fuzzy", "1");

    try {
      const response = await fetch(SEARCHURL + "?" + params.toString(), {
        method: "get",
        signal: signal,
      });

      const json = (await response.json()) as
        | {
            items: {
              icon: { path: string };
              title: string;
              subtitle: string;
              arg: string;
              valid: number;
              url: string;
            }[];
          }
        | {
            code: string;
            message: string;
          };

      if (!response.ok || "message" in json) {
        throw new Error("message" in json ? json.message : response.statusText);
      }

      const results = json.items.map((result) => ({
        icon: { path: result.icon.path },
        title: result.title || "",
        subtitle: result.subtitle || "",
        arg: result.arg || "",
        valid: result.valid,
        url: wechatService.getStartUrl(result.arg),
      }));

      // If there is search text, sort the results
      if (searchText) {
        const lowerSearchText = searchText.toLowerCase();
        return results.sort((a, b) => {
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();
          const aSubtitle = a.subtitle.toLowerCase();
          const bSubtitle = b.subtitle.toLowerCase();

          // Exact matches have the highest priority.
          const aExactMatch = aTitle === lowerSearchText || aSubtitle === lowerSearchText;
          const bExactMatch = bTitle === lowerSearchText || bSubtitle === lowerSearchText;
          if (aExactMatch && !bExactMatch) return -1;
          if (!aExactMatch && bExactMatch) return 1;

          // Starts-with matches have the second highest priority
          const aStartsWith = aTitle.startsWith(lowerSearchText) || aSubtitle.startsWith(lowerSearchText);
          const bStartsWith = bTitle.startsWith(lowerSearchText) || bSubtitle.startsWith(lowerSearchText);
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;

          // Contains matching
          const aContains = aTitle.includes(lowerSearchText) || aSubtitle.includes(lowerSearchText);
          const bContains = bTitle.includes(lowerSearchText) || bSubtitle.includes(lowerSearchText);
          if (aContains && !bContains) return -1;
          if (!aContains && bContains) return 1;

          // Finally in original order
          return 0;
        });
      }

      return results;
    } catch (error) {
      console.error("API search failed:", error);
      if (!(error instanceof AbortError)) {
        if (!WeChatManager.isWeChatRunning()) {
          throw new Error("WeChat is not running");
        }
      }
      throw error;
    }
  }
}

export const contactService = new ContactService();
