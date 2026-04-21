import { showToast, Toast } from "@raycast/api";
import { ApiService } from "./ApiService";
import { HLTB_BASE_URL, HLTB_DETAIL_URL, HLTB_IMAGE_URL, HLTB_API_SEARCH_ENDPOINT } from "./constants";
import type { SearchPayload, SearchResponse } from "./types";

export class HltbSearch {
  public static BASE_URL = HLTB_BASE_URL;
  public static DETAIL_URL = HLTB_DETAIL_URL;
  public static IMAGE_URL = HLTB_IMAGE_URL;

  payload: SearchPayload = {
    searchType: "games",
    searchTerms: [""],
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: "",
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: { min: null, max: null },
        gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
        rangeYear: { min: "", max: "" },
        modifier: "",
      },
      users: { sortCategory: "postcount" },
      lists: { sortCategory: "follows" },
      filter: "",
      sort: 0,
      randomizer: 0,
    },
  };

  async search(query: Array<string>, signal?: AbortSignal): Promise<SearchResponse> {
    const search: SearchPayload = { ...this.payload };
    search.searchTerms = query;

    try {
      const result = await ApiService.postWithAuth<SearchResponse>(HLTB_API_SEARCH_ENDPOINT, search, query[0] || "", {
        timeout: 20000,
        signal,
      });
      return result.data;
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error fetching game list:", message: String(error) });
      throw error;
    }
  }
}
