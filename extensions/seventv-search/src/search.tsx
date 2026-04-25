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
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
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

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState<Emote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGridView, setIsGridView] = useState(true);

  const [sortValue, setSortValue] = useState<string>("popularity");
  const [sortOrder, setSortOrder] = useState<string>("DESCENDING");
  const [category, setCategory] = useState<string>("TOP");

  useEffect(() => {
    async function fetchEmotes() {
      const query = searchText.trim();

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

  async function handleDropEmote(
    item: Emote,
    mode: "smart" | "url" | "bruteforce" = "smart",
  ) {
    const url = getEmoteUrl(item, "4x");

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

      // Sanitize name to prevent "Invalid clipboard content" errors from weird characters
      const safeName = item.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const tempPath = join(tmpdir(), `vault_${safeName}_${item.id}.webp`);
      await writeFile(tempPath, buffer);

      // Attempt Copy/Paste
      try {
        await Clipboard.copy({
          path: tempPath,
          html: `<img src="${url}" alt="${item.name}" />`,
        });

        if (mode === "bruteforce") {
          // In bruteforce mode, we attempt both copy and multiple paste triggers
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

  const toggleViewAction = (
    <Action
      title={isGridView ? "Switch to List View" : "Switch to Grid View"}
      icon={isGridView ? Icon.List : Icon.Grid}
      onAction={() => setIsGridView(!isGridView)}
      shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
    />
  );

  const renderActions = (item: Emote) => {
    const highResUrl = getEmoteUrl(item, "4x");
    const markdown = `![${item.name}](${highResUrl})`;

    return (
      <ActionPanel>
        <ActionPanel.Section>
          {/* Primary Action: Enter -> Smart Drop */}
          <Action
            title="Drop Emote"
            icon={Icon.ChevronRight}
            onAction={() => handleDropEmote(item, "smart")}
          />

          {/* Bruteforce: Cmd+Shift+Enter -> Deep Drop */}
          <Action
            title="Bruteforce Drop"
            icon={Icon.Bolt}
            onAction={() => handleDropEmote(item, "bruteforce")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />

          {/* Force URL: Cmd+Enter */}
          <Action
            title="Force Paste URL"
            icon={Icon.Link}
            onAction={() => handleDropEmote(item, "url")}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        </ActionPanel.Section>

        <ActionPanel.Section>
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
              const res = await fetch(highResUrl);
              const buffer = Buffer.from(await res.arrayBuffer());
              const safeName = item.name
                .replace(/[^a-z0-9]/gi, "_")
                .toLowerCase();
              const tempPath = join(tmpdir(), `copy_${safeName}.webp`);
              await writeFile(tempPath, buffer);
              await Clipboard.copy({ path: tempPath });
              await showToast({
                title: "File Copied",
                message: "Ready to paste (Cmd+V)",
              });
            }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="View on 7tv"
            url={`https://7tv.app/emotes/${item.id}`}
          />
          {toggleViewAction}
          <Action.CopyToClipboard
            title="Copy Id"
            content={item.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Download Emote (high Res)"
            url={highResUrl}
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
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
        <Grid.Section title={`${category} Results`}>
          {items.map((item) => (
            <Grid.Item
              key={item.id}
              title={item.name}
              subtitle={item.owner?.display_name}
              content={{ source: getEmoteUrl(item, "2x") }}
              actions={renderActions(item)}
            />
          ))}
        </Grid.Section>
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
      <List.Section title={`${category} Results`}>
        {items.map((item) => (
          <List.Item
            key={item.id}
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
    </List>
  );
}
