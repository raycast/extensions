import {
  Grid,
  Action,
  ActionPanel,
  getPreferenceValues,
  showHUD,
  Clipboard,
  Toast,
  showToast,
  Icon,
  Color,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

interface Preferences {
  giphyApiKey: string;
  markdownStyle: "image" | "html" | "url";
  htmlWidth: string;
}

interface GiphyImage {
  url: string;
  width: string;
  height: string;
}

interface GiphyGif {
  id: string;
  title: string;
  slug: string;
  images: {
    fixed_height: GiphyImage;
    fixed_height_still: GiphyImage;
    original: GiphyImage;
    downsized_medium: GiphyImage;
  };
  url: string;
}

interface GiphyResponse {
  data: GiphyGif[];
  pagination: {
    total_count: number;
    count: number;
    offset: number;
  };
}

function buildMarkdown(gif: GiphyGif, prefs: Preferences): string {
  const gifUrl = gif.images.original.url;
  // Use a clean URL without Giphy tracking params for GitHub
  const cleanUrl = gifUrl.split("?")[0];
  const alt = gif.title || gif.slug || "gif";

  switch (prefs.markdownStyle) {
    case "html": {
      const width = prefs.htmlWidth || "400";
      return `<img src="${cleanUrl}" width="${width}" alt="${alt}" />`;
    }
    case "url":
      return cleanUrl;
    case "image":
    default:
      return `![${alt}](${cleanUrl})`;
  }
}

export default function SearchGif() {
  const prefs = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [columns, setColumns] = useState(3);

  const isSearching = searchText.trim().length > 0;

  // Trending when no query, search when there is one
  const endpoint = isSearching
    ? `https://api.giphy.com/v1/gifs/search?api_key=${prefs.giphyApiKey}&q=${encodeURIComponent(searchText)}&limit=25&rating=g`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${prefs.giphyApiKey}&limit=25&rating=g`;

  const { data, isLoading, error } = useFetch<GiphyResponse>(endpoint, {
    keepPreviousData: true,
  });

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Giphy API Error",
      message: error.message.includes("401")
        ? "Invalid API key. Check your preferences."
        : error.message,
    });
  }

  async function handleSelect(gif: GiphyGif) {
    const markdown = buildMarkdown(gif, prefs);
    await Clipboard.paste(markdown);
    await showHUD(`GIF pasted! 🎉`);
  }

  async function handleCopyMarkdown(gif: GiphyGif) {
    const markdown = buildMarkdown(gif, prefs);
    await Clipboard.copy(markdown);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard!",
    });
  }

  async function handleCopyUrl(gif: GiphyGif) {
    const cleanUrl = gif.images.original.url.split("?")[0];
    await Clipboard.copy(cleanUrl);
    await showToast({ style: Toast.Style.Success, title: "URL copied!" });
  }

  const gifs = data?.data ?? [];

  return (
    <Grid
      columns={columns}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Giphy... (e.g. 'success', 'bug fixed', 'deploy')"
      throttle
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Columns"
          onChange={(val) => setColumns(Number(val))}
          defaultValue="3"
        >
          <Grid.Dropdown.Item title="2 Columns" value="2" />
          <Grid.Dropdown.Item title="3 Columns" value="3" />
          <Grid.Dropdown.Item title="4 Columns" value="4" />
          <Grid.Dropdown.Item title="5 Columns" value="5" />
        </Grid.Dropdown>
      }
    >
      <Grid.Section
        title={isSearching ? `Results for "${searchText}"` : "🔥 Trending"}
        subtitle={data ? `${gifs.length} GIFs` : undefined}
      >
        {gifs.map((gif) => (
          <Grid.Item
            key={gif.id}
            content={{
              value: gif.images.fixed_height.url,
              tooltip: gif.title,
            }}
            title={gif.title}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Insert">
                  <Action
                    title="Paste into Active App"
                    icon={Icon.ArrowRight}
                    onAction={() => handleSelect(gif)}
                  />
                  <Action
                    title="Copy Markdown"
                    icon={Icon.Code}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onAction={() => handleCopyMarkdown(gif)}
                  />
                  <Action
                    title="Copy URL Only"
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onAction={() => handleCopyUrl(gif)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="View">
                  <Action.OpenInBrowser
                    title="Open on Giphy"
                    url={gif.url}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>

      {!isLoading && gifs.length === 0 && isSearching && (
        <Grid.EmptyView
          icon={{
            source: Icon.MagnifyingGlass,
            tintColor: Color.SecondaryText,
          }}
          title="No GIFs Found"
          description={`Try a different search term for "${searchText}"`}
        />
      )}
    </Grid>
  );
}
