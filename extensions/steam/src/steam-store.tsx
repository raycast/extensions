import { useState } from "react";
import { ActionPanel, Action, List, Icon, showToast, Toast, open } from "@raycast/api";

interface StoreCategory {
  title: string;
  url: string;
  icon: Icon;
  description: string;
}

export default function SteamStore() {
  const [searchText, setSearchText] = useState("");

  const storeCategories: StoreCategory[] = [
    {
      title: "Featured",
      url: "https://store.steampowered.com/",
      icon: Icon.Star,
      description: "Featured games and deals",
    },
    {
      title: "New Releases",
      url: "https://store.steampowered.com/new/",
      icon: Icon.Star,
      description: "Latest game releases",
    },
    {
      title: "Top Sellers",
      url: "https://store.steampowered.com/search/?sort_by=_ASC&category1=998&os=win",
      icon: Icon.Trophy,
      description: "Best selling games",
    },
    {
      title: "Free to Play",
      url: "https://store.steampowered.com/genre/Free%20to%20Play/",
      icon: Icon.Gift,
      description: "Free games to play",
    },
    {
      title: "Early Access",
      url: "https://store.steampowered.com/genre/Early%20Access/",
      icon: Icon.Hammer,
      description: "Games in development",
    },
    {
      title: "VR Games",
      url: "https://store.steampowered.com/vr/",
      icon: Icon.Eye,
      description: "Virtual Reality games",
    },
    {
      title: "Indie Games",
      url: "https://store.steampowered.com/tags/en/Indie/",
      icon: Icon.Brush,
      description: "Independent game developers",
    },
    {
      title: "Action Games",
      url: "https://store.steampowered.com/tags/en/Action/",
      icon: Icon.Bolt,
      description: "Fast-paced action games",
    },
    {
      title: "RPG Games",
      url: "https://store.steampowered.com/tags/en/RPG/",
      icon: Icon.Bolt,
      description: "Role-playing games",
    },
    {
      title: "Strategy Games",
      url: "https://store.steampowered.com/tags/en/Strategy/",
      icon: Icon.ChessPiece,
      description: "Strategic thinking games",
    },
    {
      title: "Simulation Games",
      url: "https://store.steampowered.com/tags/en/Simulation/",
      icon: Icon.Gear,
      description: "Life and business simulators",
    },
    {
      title: "Sports Games",
      url: "https://store.steampowered.com/tags/en/Sports/",
      icon: Icon.SoccerBall,
      description: "Sports and racing games",
    },
  ];

  async function openStorePage(url: string, title: string) {
    try {
      await open(url);
      showToast({
        style: Toast.Style.Success,
        title: "Store Page Opened",
        message: `Opening ${title}`,
      });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open Store",
        message: "Could not open the Steam store page",
      });
    }
  }

  async function searchStore(query: string) {
    if (!query.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search Query Required",
        message: "Please enter a search term",
      });
      return;
    }

    try {
      const searchUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(query)}`;
      await open(searchUrl);
      showToast({
        style: Toast.Style.Success,
        title: "Search Opened",
        message: `Searching for "${query}"`,
      });
    } catch {
      showToast({
        style: Toast.Style.Failure,
        title: "Search Failed",
        message: "Could not open the search page",
      });
    }
  }

  const filteredCategories = storeCategories.filter(
    (category) =>
      category.title.toLowerCase().includes(searchText.toLowerCase()) ||
      category.description.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      searchBarPlaceholder="Search store categories or enter a game name..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.length > 0 && (
        <List.Section title="Search Results">
          <List.Item
            title={`Search for "${searchText}"`}
            subtitle="Search the Steam Store"
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action icon={Icon.MagnifyingGlass} title="Search Store" onAction={() => searchStore(searchText)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Store Categories">
        {filteredCategories.map((category) => (
          <List.Item
            key={category.title}
            title={category.title}
            subtitle={category.description}
            icon={category.icon}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Globe}
                  title="Open Store Page"
                  onAction={() => openStorePage(category.url, category.title)}
                />
                <ActionPanel.Section>
                  <Action
                    icon={Icon.MagnifyingGlass}
                    title="Search Games"
                    onAction={() =>
                      showToast({
                        style: Toast.Style.Success,
                        title: "Feature Coming Soon",
                        message: "Search games functionality will be available soon",
                      })
                    }
                  />
                  <Action
                    icon={Icon.Download}
                    title="Download Game"
                    onAction={() =>
                      showToast({
                        style: Toast.Style.Success,
                        title: "Feature Coming Soon",
                        message: "Download functionality will be available soon",
                      })
                    }
                  />
                  <Action
                    icon={Icon.Book}
                    title="Steam Library"
                    onAction={() =>
                      showToast({
                        style: Toast.Style.Success,
                        title: "Feature Coming Soon",
                        message: "Steam library functionality will be available soon",
                      })
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Quick Actions">
        <List.Item
          title="Steam Client"
          subtitle="Open Steam application"
          icon={Icon.AppWindow}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.AppWindow}
                title="Open Steam"
                onAction={async () => {
                  try {
                    await open("steam://");
                    showToast({
                      style: Toast.Style.Success,
                      title: "Steam Opened",
                      message: "Launching Steam client",
                    });
                  } catch {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to Open Steam",
                      message: "Make sure Steam is installed",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Steam Big Picture"
          subtitle="Launch Steam Big Picture mode"
          icon={Icon.AppWindow}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.AppWindow}
                title="Open Big Picture"
                onAction={async () => {
                  try {
                    await open("steam://open/bigpicture");
                    showToast({
                      style: Toast.Style.Success,
                      title: "Big Picture Opened",
                      message: "Launching Steam Big Picture mode",
                    });
                  } catch {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to Open Big Picture",
                      message: "Make sure Steam is installed",
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
