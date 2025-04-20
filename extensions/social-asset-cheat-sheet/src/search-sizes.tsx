import { Action, ActionPanel, Detail, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import socialSizesData from "./data/socialSizes.json";

interface SocialImageSize {
  platform: string;
  type: string;
  width: number;
  height: number;
  icon: Icon;
  id: string;
  lastVerified: string;
  aspectRatio: {
    simplified: string;
    decimal: string;
  };
}

type PlatformName = "Instagram" | "Twitter/X" | "Facebook" | "LinkedIn" | "Pinterest" | "YouTube";

// Convert JSON data to SocialImageSize objects
const socialSizes: SocialImageSize[] = socialSizesData.sizes.map((size) => ({
  ...size,
  icon: Icon[size.icon as keyof typeof Icon],
  aspectRatio: calculateAspectRatio(size.width, size.height),
}));

function calculateAspectRatio(width: number, height: number) {
  const gcd = (a: number, b: number): number => {
    while (b) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  };

  const divisor = gcd(width, height);
  const simplifiedWidth = width / divisor;
  const simplifiedHeight = height / divisor;

  return {
    simplified: `${simplifiedWidth}:${simplifiedHeight}`,
    decimal: (width / height).toFixed(2),
  };
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  // Filter function that handles multiple search terms
  const filterSizes = (sizes: SocialImageSize[], search: string) => {
    if (!search.trim()) return sizes;

    const searchTerms = search.toLowerCase().split(/\s+/);

    return sizes.filter((size) => {
      const searchableText = [
        size.platform.toLowerCase(),
        size.type.toLowerCase(),
        `${size.width}x${size.height}`,
        size.aspectRatio.simplified,
        size.aspectRatio.decimal,
      ].join(" ");

      return searchTerms.every((term) => searchableText.includes(term));
    });
  };

  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    // Load favorites
    LocalStorage.getItem<string>("favorites").then((savedFavorites) => {
      if (savedFavorites) {
        try {
          setFavorites(JSON.parse(savedFavorites));
        } catch (error) {
          showFailureToast(error, { title: "Failed to load favorites" });
        }
      }
    });

    // Check for updates
    LocalStorage.getItem("lastUpdateCheck").then((lastChecked) => {
      const now = new Date().toISOString();
      if (
        !lastChecked ||
        (typeof lastChecked === "string" &&
          new Date(lastChecked).getTime() < new Date().getTime() - 24 * 60 * 60 * 1000)
      ) {
        checkForUpdates();
        LocalStorage.setItem("lastUpdateCheck", now);
      }
    });
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await fetch(
        "https://api.github.com/repos/YOUR_USERNAME/social-asset-cheat-sheet/contents/src/data/socialSizes.json",
      );
      const data = (await response.json()) as { content: string };
      const remoteVersion = JSON.parse(atob(data.content)).version;

      if (remoteVersion !== socialSizesData.version) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Update Available",
          message: "New image sizes are available. Update the extension to get the latest sizes.",
        });
      }
    } catch (error) {
      // Silently fail - we don't want to bother users if update check fails
      console.error("Failed to check for updates:", error);
    }
  };

  const toggleFavorite = async (sizeId: string) => {
    const newFavorites = favorites.includes(sizeId) ? favorites.filter((id) => id !== sizeId) : [...favorites, sizeId];

    setFavorites(newFavorites);
    await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
  };

  const filteredSizes = filterSizes(socialSizes, searchText);

  // Sort sizes with favorites at the top
  const sortedSizes = [...filteredSizes].sort((a, b) => {
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
      navigationTitle="Search Image Sizes"
      searchBarPlaceholder="Search by platform, type, dimensions (e.g., '1080x1920') or ratio (e.g., '16:9')..."
    >
      {sortedSizes.map((size) => (
        <List.Item
          key={size.id}
          title={`${size.platform} - ${size.type}`}
          subtitle={`${size.width} × ${size.height}`}
          accessories={[...(favorites.includes(size.id) ? [{ icon: Icon.Star, tooltip: "Favorited" }] : [])]}
          icon={size.icon}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                {/* Primary Actions */}
                <Action.Paste
                  title="Paste Dimensions"
                  content={`${size.width} × ${size.height}`}
                  shortcut={{ modifiers: [], key: "return" }}
                />
                <Action.Paste
                  title="Paste Title & Dimensions"
                  content={`${size.platform} - ${size.type}: ${size.width} x ${size.height}`}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action.CopyToClipboard
                  title="Copy Dimensions to Clipboard"
                  content={`${size.width} × ${size.height}`}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action.CopyToClipboard
                  title="Copy Title & Dimensions to Clipboard"
                  content={`${size.platform} - ${size.type}: ${size.width} x ${size.height}`}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                {/* Secondary Actions */}
                <Action
                  title={favorites.includes(size.id) ? "Remove from Favorites" : "Add to Favorites"}
                  icon={favorites.includes(size.id) ? Icon.StarDisabled : Icon.Star}
                  onAction={() => toggleFavorite(size.id)}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
                <Action.Push
                  title="Show Details"
                  icon={Icon.Info}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  target={
                    <Detail
                      markdown={`# ${size.platform} - ${size.type}

- **Dimensions:** ${size.width} × ${size.height}
- **Aspect Ratio:** ${size.aspectRatio.simplified} (${size.aspectRatio.decimal})
- **Last Verified:** ${size.lastVerified}

### ${size.platform} Best Practices
${socialSizesData.platformBestPractices?.[size.platform as PlatformName]?.map((practice: string) => `- ${practice}`).join("\n") || "- Use high-quality images\n- Keep file size optimized for web\n- Follow platform guidelines for best results"}`}
                    />
                  }
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
