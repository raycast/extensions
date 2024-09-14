import { environment } from "@raycast/api";
import path from "path";

export const API_URL = "https://cursor.directory/api/";
export const API_URL_POPULAR = "https://cursor.directory/api/popular/";
export const ALL_PROMPTS_CACHE_PATH = !environment.isDevelopment
  ? environment.supportPath + "all_prompts_cache.json"
  : path.join(__dirname, "..", "cursor-directory", "all_prompts_cache.json");
export const POPULAR_PROMPTS_CACHE_PATH = !environment.isDevelopment
  ? environment.supportPath + "popular_prompts_cache.json"
  : path.join(__dirname, "..", "cursor-directory", "popular_prompts_cache.json");
