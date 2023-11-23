import { showToast, Toast } from "@raycast/api";
import axios from "axios";
import UserAgent from "user-agents";

/**
 * Takes care about the http connection and response handling
 */
export class HltbSearch {
  public static BASE_URL = "https://howlongtobeat.com/";
  public static DETAIL_URL = `${HltbSearch.BASE_URL}game?id=`;
  public static SEARCH_URL = `${HltbSearch.BASE_URL}api/search`;
  public static IMAGE_URL = `${HltbSearch.BASE_URL}games/`;

  payload = {
    searchType: "games",
    searchTerms: [] as string[],
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: "",
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: {
          min: 0,
          max: 0,
        },
        gameplay: {
          perspective: "",
          flow: "",
          genre: "",
        },
        modifier: "",
      },
      users: {
        sortCategory: "postcount",
      },
      filter: "",
      sort: 0,
      randomizer: 0,
    },
  };

  async search(query: Array<string>, signal?: AbortSignal): Promise<any> {
    // Use built-in javascript URLSearchParams as a drop-in replacement to create axios.post required data param
    const search = { ...this.payload };
    search.searchTerms = query;

    try {
      const result = await axios.post(HltbSearch.SEARCH_URL, search, {
        headers: {
          "content-type": "application/json",
          origin: "https://howlongtobeat.com/",
          referer: "https://howlongtobeat.com/",
          "User-Agent": new UserAgent().toString(),
        },
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
