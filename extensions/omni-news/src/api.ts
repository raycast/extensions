import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { Article } from "./Article";
import {
  createDuration,
  checkForCategory,
  getImageLink,
  sortArticleByTime,
  checkForDescription,
} from "./ArticleUtils";

export async function fecthArticle() {
  const preferences = getPreferenceValues();
  const limit = preferences.OmniNewsLimit;
  const removeAds = preferences.OmniNewsShowAds;
  const baseUrl = "https://omni.se/";
  const url = "https://omni-content.omni.news/articles?&limit=" + limit;

  const articles: Article[] = [];
  await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })
    .then(function (response) {
      return response.json() as any;
    })
    .then(function (myJson) {
      for (let i = 0; i < limit; i++) {
        const articleResponse = myJson.articles[i][0];

        const article_id: string = articleResponse.article_id;
        const title: string = Object(articleResponse.title)["value"];

        if (article_id == undefined || title == undefined) {
          continue;
        }

        const category = checkForCategory(articleResponse).valueOf();
        if (removeAds && category == "Annonsmaterial") {
          continue;
        }
        const description: string = checkForDescription(articleResponse);
        const articleLink: string = baseUrl + article_id;
        const imageLink = getImageLink(articleResponse);
        const duration = createDuration(articleResponse);

        const article: Article = {
          article_id: article_id,
          title: title,
          description: description,
          articleLink: articleLink,
          imageLink: imageLink,
          duration: duration,
          category: category,
          url: baseUrl + article_id,
        };

        articles.push(article);
      }
    });

  return sortArticleByTime(articles);
}
