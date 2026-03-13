import { Cache, showToast, Toast } from "@raycast/api";
import * as yaml from "js-yaml";
import { GitHubContent, Item } from "./types";

// Constants
export const CACHE_KEY = "ccfddl-conference-data";
export const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
export const cache = new Cache();

// Modified to take a manual refresh parameter and callbacks
export async function fetchFromGitHub(
  isManualRefresh = false,
  options: {
    onSuccess: (data: Item[]) => void;
    onError: (error: Error) => void;
    onFinish: () => void;
  },
) {
  try {
    // GitHub repo API endpoint for the conference directory
    const repoOwner = "ccfddl";
    const repoName = "ccf-deadlines";
    const conferenceDirPath = "conference";
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${conferenceDirPath}`;

    // Dynamically import node-fetch
    const { default: fetch } = await import("node-fetch");
    console.log("Fetching categories from GitHub:", apiUrl);

    const categoriesResponse = await fetch(apiUrl);
    if (!categoriesResponse.ok) {
      throw new Error(`GitHub API error: ${categoriesResponse.statusText}`);
    }

    const categories = (await categoriesResponse.json()) as GitHubContent[];
    const allItems: Item[] = [];

    // Process each category directory
    for (const category of categories) {
      if (category.type === "dir") {
        const categoryUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${category.path}`;
        console.log(`Fetching files from category: ${category.name}`);

        const filesResponse = await fetch(categoryUrl);
        if (!filesResponse.ok) {
          console.error(`Failed to fetch files for ${category.name}: ${filesResponse.statusText}`);
          continue;
        }

        const files = (await filesResponse.json()) as GitHubContent[];

        // Process each YAML file in the category
        for (const file of files) {
          if (file.name.endsWith(".yml") && file.download_url) {
            console.log(`Fetching YAML from: ${file.name}`);

            const yamlResponse = await fetch(file.download_url);
            if (!yamlResponse.ok) {
              console.error(`Failed to fetch YAML for ${file.name}: ${yamlResponse.statusText}`);
              continue;
            }

            const yamlText = await yamlResponse.text();
            try {
              const yamlContent = yaml.load(yamlText) as Item[];
              if (Array.isArray(yamlContent)) {
                allItems.push(...yamlContent);
              }
            } catch (yamlError) {
              console.error(`Failed to parse YAML for ${file.name}:`, yamlError);
            }
          }
        }
      }
    }

    // Sort conferences within each item by year (descending)
    allItems.forEach((item) => {
      if (item.confs && Array.isArray(item.confs)) {
        item.confs.sort((a, b) => b.year - a.year);
      }
    });

    // Store in cache
    cache.set(CACHE_KEY, JSON.stringify(allItems));

    console.log(`Loaded ${allItems.length} conferences from GitHub and cached`);

    // Call success callback
    options.onSuccess(allItems);

    // Show success toast when manually refreshed
    if (isManualRefresh) {
      showToast({
        style: Toast.Style.Success,
        title: "Data Refreshed",
        message: `Successfully loaded ${allItems.length} conferences`,
      });
    }
  } catch (error) {
    console.error("Failed to load conference data from GitHub:", error);

    // Call error callback with the caught error
    options.onError(error instanceof Error ? error : new Error(String(error)));

    // Show error toast for manual refreshes
    if (isManualRefresh) {
      showToast({
        style: Toast.Style.Failure,
        title: "Refresh Failed",
        message: "Failed to refresh conference data",
      });
    }
  } finally {
    // Always call the finish callback
    options.onFinish();
  }
}
