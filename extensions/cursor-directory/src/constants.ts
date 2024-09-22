import { environment } from "@raycast/api";
import path from "path";

export const API_URL = "https://cursor.directory/api/";
export const API_URL_POPULAR = "https://cursor.directory/api/popular/";
export const ALL_CURSOR_RULES_CACHE_PATH = !environment.isDevelopment
  ? environment.supportPath + "all_cursor_rules_cache.json"
  : path.join(__dirname, "..", "cursor-directory", "all_cursor_rules_cache.json");
export const POPULAR_CURSOR_RULES_CACHE_PATH = !environment.isDevelopment
  ? environment.supportPath + "popular_cursor_rules_cache.json"
  : path.join(__dirname, "..", "cursor-directory", "popular_cursor_rules_cache.json");
