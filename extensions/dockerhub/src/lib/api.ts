import axios from "axios";
import { FilterType, SearchResult, SearchSummary, SourceType } from "./type";

export enum SearchType {
  IMAGE = "image",
}

export async function search(query: {
  q: string;
  type?: string;
  page?: number;
  page_size?: number;
}): Promise<SearchResult> {
  const url = "https://hub.docker.com/api/content/v1/products/search";
  try {
    const resp = await axios.get(url, {
      params: query,
      headers: {
        "Search-Version": "v3",
      },
    });
    const result: SearchResult = resp.data;
    result.summaries = result.summaries?.map((summary: SearchSummary) => {
      if (summary.filter_type === FilterType.OFFICIAL) {
        summary.url = `https://hub.docker.com/_/${summary.slug}`;
      } else {
        summary.url = `https://hub.docker.com/r/${summary.slug}`;
      }
      switch (summary.filter_type) {
        case FilterType.OFFICIAL:
          summary.from = "Official";
          break;
        case FilterType.VERIFIED_PUBLISHER:
          summary.from = "Verified Publisher";
          break;
        case FilterType.COMMUNITY:
          summary.from = "Community";
          break;
      }
      return summary;
    });
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err);
  }
}
