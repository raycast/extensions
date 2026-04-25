import {
  List,
  Grid,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Image,
  Clipboard,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

interface Emote {
  id: string;
  name: string;
  owner?: {
    display_name: string;
  };
  host: {
    url: string;
    files: {
      name: string;
      static_name: string;
      width: number;
      height: number;
      format: string;
    }[];
  };
  animated?: boolean;
}

const FAVORITES_KEY = "favorites_v1";
const HISTORY_KEY = "history_v1";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<Emote[]>([]);
  const [favorites, setFavorites] = useState<Emote[]>([]);
  const [history, setHistory] = useState<Emote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGridView, setIsGridView] = useState(true);

  const [sortValue, setSortValue] = useState<string>("popularity");
  const [sortOrder, setSortOrder] = useState<string>("DESCENDING");
  const [category, setCategory] = useState<string>("TOP");

  // Load Persistent State
  useEffect(() => {
    async function loadStorage() {
      const storedFavs = await LocalStorage.getItem<string>(FAVORITES_KEY);
      const storedHist = await LocalStorage.getItem<string>(HISTORY_KEY);
      if (storedFavs) setFavorites(JSON.parse(storedFavs));
      if (storedHist) setHistory(JSON.parse(storedHist));
    }
    loadStorage();
  }, []);

  useEffect(() => {
    async function fetchEmotes() {
      const query = searchText.trim();
      if (
        !query &&
        !category.startsWith("TRENDING") &&
        !category.startsWith("TOP")
      ) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const gqlQuery = {
          query: `
            query SearchEmotes($query: String!, $page: Int, $limit: Int, $sort: Sort, $filter: EmoteSearchFilter) {
              emotes(query: $query, page: $page, limit: $limit, sort: $sort, filter: $filter) {
                count
                items {
                  id
                  name
                  animated
                  owner {
                    display_name
                  }
                  host {
                    url
                    files {
                      name
                      static_name
                      width
                      height
                      format
                    }
                  }
                }
              }
            }
          `,
          variables: {
            query: query || "",
            page: 1,
            limit: 60,
            sort: {
              value: sortValue,
              order: sortOrder,
            },
            filter: {
              category: category,
              exact_match: false,
              animated: null,
              zero_width: false,
            },
          },
        };

        const response = await fetch("https://7tv.io/v3/gql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Raycast/1.0.0 (Antigravity-Vault)",
          },
          body: JSON.stringify(gqlQuery),
        });

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`API ${response.status}: ${errBody.slice(0, 50)}`);
        }

        const resJson = (await response.json()) as {
          data: { emotes: { items: Emote[] } };
          errors?: { message: string }[];
        };
        if (resJson.errors) {
          throw new Error(resJson.errors[0]?.message || "GQL Error");
        }

        setItems(resJson.data?.emotes?.items || []);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "7TV Error",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    const delayDebounceFn = setTimeout(() => {
      fetchEmotes();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText, sortValue, sortOrder, category]);

  const getEmoteUrl = (item: Emote, size: "1x" | "2x" | "4x" = "4x") => {
    const hostUrl = item.host.url;
    return `https:${hostUrl}/${size}.webp`;
  };

  async function addToHistory(item: Emote) {
    const newHistory = [item, ...history.filter((h) => h.id !== item.id)].slice(
      0,
      20,
    );
    setHistory(newHistory);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  }

  async function toggleFavorite(item: Emote) {
    const isFav = favorites.some((f) => f.id === item.id);
    let newFavs;
    if (isFav) {
      newFavs = favorites.filter((f) => f.id !== item.id);
      await showToast({ title: "Removed from Favorites" });
    } else {
      newFavs = [item, ...favorites];
      await showToast({ title: "Added to Favorites" });
    }
    setFavorites(newFavs);
    await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
  }

  async function handleDropEmote(
    item: Emote,
    mode: "smart" | "url" | "bruteforce" = "smart",
  ) {
    const url = getEmoteUrl(item, "4x");
    await addToHistory(item);

    if (mode === "url") {
      await Clipboard.paste(url);
      await showToast({ title: "URL Pasted" });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title:
        mode === "bruteforce" ? "🔥 Bruteforcing..." : "Processing Emote...",
    });
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download failed");

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const safeName = item.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const tempPath = join(tmpdir(), `vault_${safeName}_${item.id}.webp`);
      await writeFile(tempPath, buffer);

      try {
        await Clipboard.copy({
          path: tempPath,
          html: `<img src="${url}" alt="${item.name}" />`,
        });

        if (mode === "bruteforce") {
          await Clipboard.paste();
          await Clipboard.paste({ path: tempPath });
        } else {
          await Clipboard.paste();
        }

        toast.style = Toast.Style.Success;
        toast.title =
          mode === "bruteforce" ? "Emote Bruteforced!" : "Emote Dropped!";
      } catch (clipError) {
        console.error("Drop failed:", clipError);
        await Clipboard.paste(url);
        toast.style = Toast.Style.Success;
        toast.title = "URL Pasted (Fallback)";
      }
    } catch (e) {
      console.error("Critical Error:", e);
      await Clipboard.paste(url);
      toast.style = Toast.Style.Success;
      toast.title = "URL Pasted (Error Fallback)";
    }
  }

  const renderActions = (item: Emote) => {
    const isFav = favorites.some((f) => f.id === item.id);
    const highResUrl = getEmoteUrl(item, "4x");
    const markdown = `![${item.name}](${highResUrl})`;

    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Drop Emote"
            icon={Icon.ChevronRight}
            onAction={() => handleDropEmote(item, "smart")}
          />
          <Action
            title="Bruteforce Drop"
            icon={Icon.Bolt}
            onAction={() => handleDropEmote(item, "bruteforce")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action
            title={isFav ? "Unstar Emote" : "Star Emote"}
            icon={isFav ? Icon.StarDisabled : Icon.Star}
            onAction={() => toggleFavorite(item)}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel.Section>

        <ActionPanel.Section>
          <Action
            title="Force Paste URL"
            icon={Icon.Link}
            onAction={() => handleDropEmote(item, "url")}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Action.CopyToClipboard title="Copy Emote URL" content={highResUrl} />
          <Action.CopyToClipboard
            title="Copy as Markdown"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
          />
          <Action
            title="Copy Emote File"
            icon={Icon.Download}
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Downloading Emote...",
              });
              try {
                const res = await fetch(highResUrl);
                if (!res.ok) throw new Error("Download failed");
                const data = new Uint8Array(await res.arrayBuffer());
                const safeName = item.name
                  .replace(/[^a-z0-9]/gi, "_")
                  .toLowerCase();
                const tempPath = join(tmpdir(), `copy_${safeName}.webp`);
                await writeFile(tempPath, data);
                await Clipboard.copy({ file: tempPath });
                toast.style = Toast.Style.Success;
                toast.title = "File Copied";
                toast.message = "Ready to paste (Cmd+V)";
              } catch (e) {
                toast.style = Toast.Style.Failure;
                toast.title = "Copy Failed";
                toast.message = String(e);
              }
            }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="View on 7tv"
            url={`https://7tv.app/emotes/${item.id}`}
          />
          <Action
            title={isGridView ? "Switch to List View" : "Switch to Grid View"}
            icon={isGridView ? Icon.List : Icon.Grid}
            onAction={() => setIsGridView(!isGridView)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          />
          <Action.CopyToClipboard
            title="Copy Id"
            content={item.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  const accessory = (
    <List.Dropdown
      tooltip="Sort & Filter"
      storeValue={true}
      onChange={(val) => {
        const [cat, sortVal, order] = val.split(":");
        setCategory(cat);
        setSortValue(sortVal);
        setSortOrder(order);
      }}
    >
      <List.Dropdown.Section title="Top Emotes">
        <List.Dropdown.Item
          title="Popular (All Time)"
          value="TOP:popularity:DESCENDING"
        />
        <List.Dropdown.Item
          title="Recently Created"
          value="TOP:created_at:DESCENDING"
        />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Trending">
        <List.Dropdown.Item
          title="Trending Right Now"
          value="TRENDING:popularity:DESCENDING"
        />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Alphabetical">
        <List.Dropdown.Item title="Name (A-Z)" value="TOP:name:ASCENDING" />
        <List.Dropdown.Item title="Name (Z-A)" value="TOP:name:DESCENDING" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const renderGridItems = (data: Emote[], title: string) => (
    <Grid.Section title={title}>
      {data.map((item) => (
        <Grid.Item
          key={`${title}-${item.id}`}
          title={item.name}
          subtitle={item.owner?.display_name}
          content={{ source: getEmoteUrl(item, "2x") }}
          actions={renderActions(item)}
        />
      ))}
    </Grid.Section>
  );

  const renderListItems = (data: Emote[], title: string) => (
    <List.Section title={title}>
      {data.map((item) => (
        <List.Item
          key={`${title}-${item.id}`}
          title={item.name}
          subtitle={item.owner?.display_name || "Community"}
          icon={{
            source: getEmoteUrl(item, "1x"),
            mask: Image.Mask.RoundedRect,
          }}
          actions={renderActions(item)}
        />
      ))}
    </List.Section>
  );

  if (isGridView) {
    return (
      <Grid
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search 7TV Emotes..."
        searchBarAccessory={accessory}
        columns={6}
        fit={Grid.Fit.Contain}
      >
        {!searchText &&
          favorites.length > 0 &&
          renderGridItems(favorites, "Starred Emotes")}
        {!searchText &&
          history.length > 0 &&
          renderGridItems(history, "Recently Used")}
        {(searchText || category.startsWith("TRENDING") || items.length > 0) &&
          renderGridItems(items, `${category} Results`)}
      </Grid>
    );
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search 7TV Emotes..."
      searchBarAccessory={accessory}
      throttle
    >
      {!searchText &&
        favorites.length > 0 &&
        renderListItems(favorites, "Starred Emotes")}
      {!searchText &&
        history.length > 0 &&
        renderListItems(history, "Recently Used")}
      {(searchText || category.startsWith("TRENDING") || items.length > 0) &&
        renderListItems(items, `${category} Results`)}
    </List>
  );
}
