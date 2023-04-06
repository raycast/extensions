import { Category } from "../utils/types";
import { useFetch } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { preferences } from "../utils/preferences";
import { Cache } from "@raycast/api";

const cache = new Cache();
const CACHE_KEY = "monse:categories";
const CACHE_TTL = 86400000; // 1 day in milliseconds
type CacheEntry = { timestamp: number; items: Category[] };

type CategoriesResponse = {
  isLoading: boolean;
  categories: Array<Category>;
};

const fetchCategories = function (): CategoriesResponse {
  const cachedResponse = cache.get(CACHE_KEY);
  if (cachedResponse) {
    try {
      const parsed: CacheEntry = JSON.parse(cachedResponse);
      const elapsed = Date.now() - parsed.timestamp;
      if (elapsed <= CACHE_TTL) {
        return { isLoading: false, categories: parsed.items };
      }
    } catch (e) {
      // nothing to do
    }
  }

  const { isLoading, data } = useFetch<Category[]>("https://monse.app/v1/transaction-categories", {
    headers: { Authorization: `Bearer ${preferences.token}` },
    onError: async () => {
      await showToast({
        style: Toast.Style.Failure,
        title: "Request failed",
        message: "Check your token and expiration if still don't work",
      });
    },
  });

  const categories: Array<Category> = data === undefined ? [] : data;

  if (!isLoading) {
    cache.set(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), items: categories }));
  }

  return { isLoading, categories };
};

const getCategory = function (id: number): Category {
  return (
    fetchCategories().categories.find((c) => c.id == id) ?? {
      name: "Undefined category",
      id: 0,
      type: "income",
      accountable: 1,
      icon: "question_mark",
      level: 0,
      slug: "undefined-category",
      description: "Category not found",
      parent_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    }
  );
};

export { fetchCategories, getCategory };
