import { getPreferenceValues } from "@raycast/api";

import type { FieldFilterKey, SearchOptions, SoundResultExtra } from "@/types";
import { SEARCH_FILTER_KEYS } from "@/types";

const BASE_URL = "https://freesound.org/apiv2";

export const getAuthHeaders = () => {
  const { apiKey } = getPreferenceValues<Preferences>();
  if (!apiKey) {
    throw new Error("API key is missing");
  }
  return {
    Authorization: `Token ${apiKey}`,
  };
};

export const getSearchUrl = (query: string, opts: SearchOptions = {}, extra: Partial<SoundResultExtra> = {}) => {
  const base = new URL(`${BASE_URL}/search/text/`);
  base.searchParams.append("query", query);
  if (opts.sort) {
    base.searchParams.append("sort", opts.sort);
  }
  if (opts.groupByPack) {
    base.searchParams.append("group_by_pack", "1");
  }
  if (opts.filters) {
    let filterText = "";
    SEARCH_FILTER_KEYS.forEach((key) => {
      if (typeof opts.filters![key] !== "undefined") {
        const val = opts.filters![key]!;
        if (typeof val === "boolean") {
          filterText += `${key}:${val ? "true" : "false"} `;
        } else {
          filterText += `${key}:${val} `;
        }
      }
    });
    if (filterText.length > 0) {
      base.searchParams.append("filter", filterText.trim());
    }
  }

  if (extra.page_size) {
    base.searchParams.append("page_size", extra.page_size.toString());
  } else {
    base.searchParams.append("page_size", "20");
  }

  if (extra.page) {
    base.searchParams.append("page", extra.page.toString());
  } else {
    base.searchParams.append("page", "1");
  }

  if (extra.fields && extra.fields.length > 0) {
    base.searchParams.append("fields", extra.fields.join(","));
  }

  return base.toString();
};

export const DEFAULT_KEYS: FieldFilterKey[] = [
  "id",
  "name",
  "username",
  "url",
  "description",
  "license",
  "num_downloads",
  "download",
  "type",
  "avg_rating",
  "num_ratings",
  "duration",
  "previews",
  "images",
  "bitrate",
  "bitdepth",
  "samplerate",
  "channels",
  "tags",
];
