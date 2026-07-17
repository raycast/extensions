import { Cache, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { Article } from "./models/article";
import {
  createDuration,
  checkForCategory,
  getImageLink,
  sortArticleByTime,
  checkForDescription,
} from "./articleUtils";
import { ArticleDto, ArticleResponse } from "./models/dto/articleDto";
import { CachedData } from "./models/cachedData";

// Create a cache instance
const cache = new Cache();
const CACHE_KEY = "omni-articles";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export async function fetchArticles() {
  const preferences = getPreferenceValues();
  const limit = preferences.OmniNewsLimit;
  const removeAds = preferences.OmniNewsShowAds;
  const baseUrl = "https://omni.se/";

  // Fetch from cache first
  const cachedString = cache.get(CACHE_KEY);
  if (cachedString) {
    try {
      const cachedData = JSON.parse(cachedString) as CachedData;
      const now = Date.now();

      if (now - cachedData.timestamp < CACHE_EXPIRY) {
        return cachedData.articles;
      }
    } catch (error) {
      console.error("Error parsing cached data:", error);
    }
  }

  // If cache is expired or not available, fetch fresh data
  try {
    const articleData = await fetchArticlesFromApi(limit);
    const articles = mapToArticles(articleData.flat(), baseUrl, removeAds);

    const cacheData: CachedData = {
      articles: articles,
      timestamp: Date.now(),
    };
    cache.set(CACHE_KEY, JSON.stringify(cacheData));

    return articles;
  } catch (error) {
    console.error("Failed to fetch articles:", error);
    return [];
  }
}

async function fetchArticlesFromApi(limit: number) {
  const url = `https://omni-content.omni.news/articles?&limit=${limit}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as ArticleResponse;
  return data.articles || [];
}

function mapToArticles(
  articleData: ArticleDto[],
  baseUrl: string,
  removeAds: boolean,
): Article[] {
  const articles: Article[] = [];

  for (const article of articleData) {
    const articleResponse = Array.isArray(article) ? article[0] : article;

    const article_id = articleResponse?.article_id;
    const title = articleResponse?.title?.value;

    if (!article_id || !title) {
      continue;
    }

    const category = checkForCategory(articleResponse);
    if (removeAds && category === "Annonsmaterial") {
      continue;
    }

    articles.push({
      article_id,
      title,
      description: checkForDescription(articleResponse),
      articleLink: `${baseUrl}${article_id}`,
      imageLink: getImageLink(articleResponse),
      duration: createDuration(articleResponse),
      category,
      url: `${baseUrl}${article_id}`,
    });
  }

  return sortArticleByTime(articles);
}
