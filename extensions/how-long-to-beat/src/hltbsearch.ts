import { showToast, Toast } from "@raycast/api";
import { fetchLatestHash } from "./helpers";
import { ApiService } from "./ApiService";
import type { SearchPayload } from "./types";
import { LocalStorage } from "@raycast/api";

/**
 * Takes care about the http connection and response handling
 */
export class HltbSearch {
  public static BASE_URL = "https://howlongtobeat.com/";
  public static DETAIL_URL = `${HltbSearch.BASE_URL}game?id=`;
  public static SEARCH_URL = `${HltbSearch.BASE_URL}api/s/`;
  public static IMAGE_URL = `${HltbSearch.BASE_URL}games/`;

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

  async search(query: Array<string>, signal?: AbortSignal): Promise<any> {
    // Use built-in javascript URLSearchParams as a drop-in replacement to create axios.post required data param
    const search: SearchPayload = { ...this.payload };
    search.searchTerms = query;

    let localHash = await LocalStorage.getItem<string>("hashToken");

    if (!localHash || !(await validateHash(localHash, search))) {
      // Fetch a new hash and update local storage
      localHash = await fetchLatestHash();
      LocalStorage.setItem("hashToken", localHash);
    }

    try {
      const result = await ApiService.getInstance().post(`api/s/${localHash}`, search, {
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

const validateHash = async (hash: string, search: SearchPayload): Promise<boolean> => {
  try {
    const response = await ApiService.getInstance().post(`api/search/${hash}`, search, {
      timeout: 5000, // Shorter timeout for validation
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};
