import path from "path"
import { environment } from "@raycast/api"

export const API_URL = "https://cursorrul.es/api/"
export const API_URL_POPULAR = API_URL + "popular/"
export const ALL_CURSOR_RULES_CACHE_PATH = !environment.isDevelopment
   ? environment.supportPath + "all_cursor_rules_cache.json"
   : path.join(__dirname, "..", "cursorrules", "all_cursor_rules_cache.json")
export const POPULAR_CURSOR_RULES_CACHE_PATH = !environment.isDevelopment
   ? environment.supportPath + "popular_cursor_rules_cache.json"
   : path.join(
        __dirname,
        "..",
        "cursorrules",
        "popular_cursor_rules_cache.json",
     )

export const STARRED_RULE_PREFIX = "starredRule_"
export const MAX_STARRED_RULES = 10
