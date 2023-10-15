import { Category } from "../utils/types";
import { showToast, Toast } from "@raycast/api";
import { preferences } from "../utils/preferences";
import { Cache } from "@raycast/api";
import axios from "axios";

const cache = new Cache();
const CACHE_KEY = "monse:categories";
const CACHE_TTL = 86400000; // 1 day in milliseconds
type CacheEntry = { timestamp: number; items: Category[] };

const fetchCategories = async function (): Promise<Array<Category>> {
  const cachedResponse = cache.get(CACHE_KEY);
  if (cachedResponse) {
    try {
      const parsed: CacheEntry = JSON.parse(cachedResponse);
      const elapsed = Date.now() - parsed.timestamp;
      if (elapsed <= CACHE_TTL) {
        return parsed.items;
      }
    } catch (e) {
      // nothing to do
    }
  }

  const data = await axios
    .get("https://monse.app/v1/transaction-categories", {
      headers: { Authorization: `Bearer ${preferences.token}` },
    })
    .catch(async () => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Request failed",
        message: "Check your token and expiration if still don't work",
      });
    });

  const categories: Array<Category> = data === undefined ? [] : data.data;
  cache.set(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), items: categories }));

  return categories;
};

export { fetchCategories };
