import { LocalStorage } from "@raycast/api";
import fetch from "cross-fetch";

export class Logtail {
  static TOKEN_CACHE_KEY = "LogtailToken";
  static DEFAULT_SOURCE_ID_CACHE_KEY = "DefaultSourceID";
  static SAVED_QUERY_CACHE_KEY = "SavedQueries";
  static BASE_URL = "https://logtail.com";
  static QUERY_URL = `${Logtail.BASE_URL}/api/v1/query`;
  static SOURCES_URL = `${Logtail.BASE_URL}/api/v1/sources`;
  static METADATA_TAGS_CACHE_KEY = "MetadataTags";
  static DOCS_URL = "https://betterstack.com/docs/logs/api/getting-started";

  static setToken(token: string) {
    return LocalStorage.setItem(Logtail.TOKEN_CACHE_KEY, token);
  }

  static getToken() {
    return LocalStorage.getItem<string>(Logtail.TOKEN_CACHE_KEY);
  }

  static getLogs(query?: string) {
    if (query) {
      return fetch(`${Logtail.QUERY_URL}?${query}`);
    }

    return fetch(Logtail.QUERY_URL);
  }

  static getSources() {
    return fetch(Logtail.SOURCES_URL);
  }
}
