import { load } from "cheerio";
import fetch from "node-fetch";
import { MacApp } from "./types";

const URL = "https://indiegoodies.com/awesome-open-source-mac-apps";

export async function fetchMacApps(): Promise<MacApp[]> {
  try {
    const response = await fetch(URL);
    const html = await response.text();
    return parseMacApps(html);
  } catch (error) {
    console.error("Error fetching Mac apps:", error);
    throw error;
  }
}

function parseMacApps(html: string): MacApp[] {
  const $ = load(html);
  const apps: MacApp[] = [];

  // Each app is in a div with class that contains "group flex flex-col p-4"
  $('div[class*="group flex flex-col p-4"]').each((_, element) => {
    const $element = $(element);

    // Extract app name
    const name = $element.find('p[class*="text-gray-200 font-medium"]').text().trim();

    // Extract app description
    const description = $element.find('p[class*="text-gray-400"]').text().trim();

    // Extract icon URL
    const iconUrl = $element.find("img").attr("src") || "";

    // Extract GitHub URL
    const githubUrl = $element.find('a[href*="github.com"]').attr("href") || "";

    // Extract categories
    const categories: string[] = [];
    $element.find('span[class*="bg-emerald-200/10"]').each((_, categoryElement) => {
      categories.push($(categoryElement).text().trim());
    });

    if (name && description) {
      apps.push({
        name,
        description,
        iconUrl,
        githubUrl,
        categories,
      });
    }
  });

  return apps;
}

export function getAllCategories(apps: MacApp[]): { name: string; count: number }[] {
  const categoriesMap = new Map<string, number>();

  apps.forEach((app) => {
    app.categories.forEach((category) => {
      const count = categoriesMap.get(category) || 0;
      categoriesMap.set(category, count + 1);
    });
  });

  return Array.from(categoriesMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
