import { Cache, List } from "@raycast/api";
import * as yaml from "js-yaml";
import fetch from "node-fetch";
import { useEffect, useState } from "react";
import { renderListItem } from "./list";
import { GitHubContent, Item } from "./types";

// TODO: add cache expiration logic
// TODO: add config options for users
// TODO: add manual refresh option
// TODO: add CDN support for better performance
// Constants
const CACHE_KEY = "ccfddl-conference-data";
const cache = new Cache();

export default function Command() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isShowingDetail, setIsShowingDetail] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Check cache first
        const cachedData = cache.get(CACHE_KEY);
        if (cachedData) {
          console.log("Using cached conference data");
          setItems(JSON.parse(cachedData));
          setLoading(false);
          return;
        }

        // Fetch from GitHub if no cache
        await fetchFromGitHub();
      } catch (error) {
        console.error("Failed to load conference data:", error);
        setLoading(false);
      }
    }

    async function fetchFromGitHub() {
      try {
        // GitHub repo API endpoint for the conference directory
        const repoOwner = "ccfddl";
        const repoName = "ccf-deadlines";
        const conferenceDirPath = "conference";
        const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${conferenceDirPath}`;

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

        setItems(allItems);
        setLoading(false);
        console.log(`Loaded ${allItems.length} conferences from GitHub and cached`);
      } catch (error) {
        console.error("Failed to load conference data from GitHub:", error);
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <List
      isLoading={loading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search conferences..."
      throttle={true}
    >
      {items.map((item) => renderListItem(item, isShowingDetail, setIsShowingDetail))}
    </List>
  );
}
