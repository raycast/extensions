import { FoodleRecipe, baseUrl, FoodleSearchtype } from "./types";
import * as cheerio from "cheerio";
import { URLSearchParams } from "node:url";

export async function fetchFoodleHtml(searchType: FoodleSearchtype, searchText: string) {
  const response = await fetch(baseUrl + "?" + new URLSearchParams({ f: searchType, q: searchText }).toString());
  return await response.text();
}

export function parseFoodleHtmlForRecipes(html: string): FoodleRecipe[] {
  const $ = cheerio.load(html);
  const results = $("#results");
  const recipes: FoodleRecipe[] = [];

  // search result-container for links
  results.find("a").each((_, el) => {
    const href = $(el).attr("href");
    const name = $(el).find("h2").text().trim() || $(el).text().trim();
    const source = $(el).find("cite").text().trim();

    // if a recipe-name was found in a link, treat it as a recipe
    if (name) {
      const recipe = {
        name: name,
        url: href || "",
        imageUrl: "",
        source: source,
        time: "",
      } as FoodleRecipe;

      // collect additional / optional data
      const time = $(el).find("time");
      if (time) {
        const timeText = time.text().trim();
        if (timeText) {
          recipe.time = timeText;
        }
      }

      // collect image url
      const image = $(el).find('div[class="img"]');
      if (image) {
        const css = image.attr("style");
        if (css) {
          const match = css.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/);
          if (match) {
            recipe.imageUrl = match[1].startsWith("http") ? match[1] : baseUrl + match[1];
          }
        }
      }

      recipes.push(recipe);
    }
  });

  return recipes;
}
