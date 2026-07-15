import { List, ActionPanel, Action, showToast, Toast, Clipboard, getPreferenceValues, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
async function getOrCreatePublicUrl(cocktailId: number, cocktailName: string): Promise<string | undefined> {
  // First, try to fetch cocktail details to see if a public link exists
  const detailsRes = await fetch(`${API_URL}/${cocktailId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${TOKEN}`,
      "Bar-Assistant-Bar-Id": BAR_ID,
    },
  });
  if (!detailsRes.ok) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: "Failed to fetch cocktail details" });
    return undefined;
  }
  const detailsData = (await detailsRes.json()) as {
    public_id?: string;
    data?: { public_id?: string; name?: string };
    name?: string;
  };
  // Try to find public_id in details
  let publicId = detailsData.public_id || (detailsData.data && detailsData.data.public_id);
  if (!publicId) {
    // If not found, create public link using correct API endpoint and response
    const publicLinkRes = await fetch(`${API_URL}/${cocktailId}/public-link`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${TOKEN}`,
        "Bar-Assistant-Bar-Id": BAR_ID,
      },
    });
    if (!publicLinkRes.ok) {
      let errorMsg = "Failed to create public link";
      try {
        const errorData = (await publicLinkRes.json()) as { message?: string };
        if (errorData && errorData.message) errorMsg = errorData.message;
      } catch {
        // ignore error
      }
      showToast({ style: Toast.Style.Failure, title: "Error", message: errorMsg });
      return undefined;
    }
    // The response should contain the public_id
    const publicLinkData = (await publicLinkRes.json()) as {
      public_id?: string;
      data?: { public_id?: string };
    };
    publicId = publicLinkData.public_id || (publicLinkData.data && publicLinkData.data.public_id);
    // If still not found, try to fetch again
    if (!publicId) {
      // Try to fetch details again after creation
      const detailsRes2 = await fetch(`${API_URL}/${cocktailId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${TOKEN}`,
          "Bar-Assistant-Bar-Id": BAR_ID,
        },
      });
      if (detailsRes2.ok) {
        const detailsData2 = (await detailsRes2.json()) as {
          public_id?: string;
          data?: { public_id?: string; name?: string };
          name?: string;
        };
        publicId = detailsData2.public_id || (detailsData2.data && detailsData2.data.public_id);
      }
    }
  }
  if (!publicId) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: "No public ID found in response" });
    return undefined;
  }
  // Slugify cocktail name for URL - use passed name instead of fetching
  const slug = slugifyCocktailName(cocktailName);
  // Compose correct public URL
  return `${APP_URL}/e/cocktail/${publicId}/${slug}-${BAR_ID}`;
}
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";

function slugifyCocktailName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[']/g, "") // Remove apostrophes
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, "") // Remove any remaining non-alphanumeric characters except dashes
    .replace(/-+/g, "-") // Replace multiple consecutive dashes with a single dash
    .replace(/(^-|-$)/g, ""); // Remove leading/trailing dashes
}

const preferences = getPreferenceValues<{
  API_URL: string;
  TOKEN: string;
  BAR_ID: string;
  APP_URL: string;
}>();
const API_URL = `${preferences.API_URL}/api/cocktails`; // Example: https://api.barassistant.io/api/cocktails
const TOKEN = preferences.TOKEN;
const BAR_ID = preferences.BAR_ID;
const APP_URL = preferences.APP_URL;
const CACHE_DIR = path.join(environment.supportPath, "barassistant");

type Cocktail = {
  id: number;
  name: string;
  ingredients?: { ingredient?: { name?: string } }[];
  image?: { url?: string };
};

export default function Command() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAllCocktails() {
      setIsLoading(true);
      try {
        const cacheFile = path.join(CACHE_DIR, "cocktails.json");
        // ...existing code...
        // Try to load cached cocktails from file
        // Try to load cached cocktails from file
        let shouldRefreshCache = true;
        if (fs.existsSync(cacheFile)) {
          const stats = fs.statSync(cacheFile);
          const now = Date.now();
          const cacheAgeMs = now - stats.mtimeMs;
          const oneDayMs = 24 * 60 * 60 * 1000;
          if (cacheAgeMs < oneDayMs) {
            // Cache is less than 1 day old, use it
            const cached = fs.readFileSync(cacheFile, "utf-8");
            setCocktails(JSON.parse(cached));
            setIsLoading(false);
            shouldRefreshCache = false;
          }
        }
        if (!shouldRefreshCache) return;
        let allCocktails: Cocktail[] = [];
        let page = 1;
        const perPage = 100;
        while (true) {
          const res = await fetch(`${API_URL}?per_page=${perPage}&page=${page}&include=ingredients,images`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${TOKEN}`,
              "Bar-Assistant-Bar-Id": BAR_ID,
            },
          });
          if (!res.ok) throw new Error("Failed to fetch cocktails");
          const data = (await res.json()) as { data?: (Cocktail & { images?: { url?: string }[] })[] };
          // Map image data to Cocktail type
          const cocktailsPage: Cocktail[] = Array.isArray(data.data)
            ? data.data.map((c) => ({
                ...c,
                image: c.images && Array.isArray(c.images) && c.images.length > 0 ? c.images[0] : undefined,
              }))
            : [];
          allCocktails = allCocktails.concat(cocktailsPage);
          if (cocktailsPage.length < perPage) break;
          page += 1;
        }
        setCocktails(allCocktails);
        // Write cache to file
        if (!fs.existsSync(CACHE_DIR)) {
          fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
        fs.writeFileSync(cacheFile, JSON.stringify(allCocktails), "utf-8");
      } catch (error) {
        showFailureToast(error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAllCocktails();
  }, []);

  const filteredCocktails = cocktails.filter((cocktail: Cocktail) =>
    cocktail.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search cocktails..." onSearchTextChange={setSearchText} throttle>
      {filteredCocktails.map((cocktail) => {
        const ingredientNames =
          cocktail.ingredients && cocktail.ingredients.length > 0
            ? cocktail.ingredients
                .map((i) => (i.ingredient && i.ingredient.name ? i.ingredient.name : ""))
                .filter((name) => !!name)
                .join(", ")
            : undefined;
        return (
          <List.Item
            key={cocktail.id}
            title={cocktail.name}
            subtitle={ingredientNames}
            icon={cocktail.image && cocktail.image.url ? cocktail.image.url : undefined}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Cocktail Page"
                  url={`${APP_URL}/cocktails/${slugifyCocktailName(cocktail.name)}-${BAR_ID}`}
                />
                <Action
                  title="📋   Copy Public URL"
                  onAction={async () => {
                    const url = await getOrCreatePublicUrl(cocktail.id, cocktail.name);
                    if (url) {
                      await Clipboard.copy(url);
                      showToast({ style: Toast.Style.Success, title: "Copied Public URL", message: url });
                    }
                  }}
                />
                {/* Add more actions if needed */}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
