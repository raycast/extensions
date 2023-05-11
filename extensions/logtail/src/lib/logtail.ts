import { LocalStorage } from "@raycast/api";
import fetch from "cross-fetch";

export class LogTail {
  static TOKEN_CACHE_KEY = "LogTailToken";
  static DEFAULT_SOURCE_ID_CACHE_KEY = "DefaultSourceID";
  static SAVED_QUERY_CACHE_KEY = "SavedQueries";
  static BASE_URL = "https://logtail.com";
  static QUERY_URL = `${LogTail.BASE_URL}/api/v1/query`;
  static SOURCES_URL = `${LogTail.BASE_URL}/api/v1/sources`;
  static METADATA_TAGS_CACHE_KEY = "MetadataTags";
  static DOCS_URL = "https://betterstack.com/docs/logs/api/getting-started";

  static setToken(token: string) {
    return LocalStorage.setItem(LogTail.TOKEN_CACHE_KEY, token);
  }

  static getToken() {
    return LocalStorage.getItem<string>(LogTail.TOKEN_CACHE_KEY);
  }

  static getLogs(query?: string) {
    console.log(query);
    if (query) {
      return fetch(`${LogTail.QUERY_URL}?${query}`);
    }

    return fetch(LogTail.QUERY_URL);
  }

  static getSources() {
    return fetch(LogTail.SOURCES_URL);
  }
}
