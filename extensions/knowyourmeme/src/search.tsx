import {
  Action,
  ActionPanel,
  Detail,
  Grid,
  Icon,
  Image,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { search, getMeme, MemeResult, MemeDetails } from "knowyourmeme-js";

// Helpers
function escapeHtmlAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const isGridView = preferences.viewType === "grid";
  const maxResults = preferences.maxResults;

  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MemeResult[]>([]);

  useEffect(() => {
    if (!searchText) return;
    setIsLoading(true);
    (async () => {
      const results = await search(searchText, Number(maxResults));
      setData(results);
      setIsLoading(false);
    })();
  }, [searchText, maxResults]);

  if (isGridView) {
    return (
      <Grid isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search for memes" throttle>
        {isLoading && searchText ? (
          <Grid.EmptyView title="Loading..." icon={Icon.Hourglass} description="Fetching memes..." />
        ) : searchText ? (
          <Grid.Section title="Results" subtitle={data?.length + ""}>
            {data?.map((meme) => (
              <SearchGridItem
                key={meme.link}
                searchResult={{
                  name: meme.title,
                  url: meme.link,
                  image: meme.thumbnail.url,
                }}
              />
            ))}
          </Grid.Section>
        ) : (
          <Grid.EmptyView title="Start Searching" description="Search for a meme to get info about it" />
        )}
      </Grid>
    );
  } else {
    return (
      <List
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search for memes..."
        throttle
      >
        {isLoading && searchText ? (
          <List.EmptyView title="Loading..." icon={Icon.Hourglass} description="Fetching memes..." />
        ) : searchText ? (
          <List.Section title="Results" subtitle={data?.length + ""}>
            {data?.map((meme) => (
              <SearchListItem
                key={meme.link}
                searchResult={{
                  name: meme.title,
                  url: meme.link,
                  image: meme.thumbnail.url,
                }}
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView title="Start Searching" description="Search for a meme to get info about it" />
        )}
      </List>
    );
  }
}

function SearchGridItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <Grid.Item
      title={searchResult.name}
      content={{ source: searchResult.image }}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Sidebar} title="Show Details" target={<MemeDetail searchResult={searchResult} />} />
          <ActionPanel.Section>
            <Action.OpenInBrowser url={searchResult.url} />
            <Action.CopyToClipboard
              title="Copy URL"
              content={searchResult.url}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "c" },
                windows: { modifiers: ["ctrl", "shift"], key: "c" },
              }}
            />
          </ActionPanel.Section>
          <Action
            icon={Icon.Cog}
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "," },
              windows: { modifiers: ["ctrl", "shift"], key: "," },
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      icon={{
        source: searchResult.image ?? "⬛",
        mask: Image.Mask.Circle,
      }}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Sidebar} title="Show Details" target={<MemeDetail searchResult={searchResult} />} />
          <ActionPanel.Section>
            <Action.OpenInBrowser url={searchResult.url} />
            <Action.CopyToClipboard
              title="Copy URL"
              content={searchResult.url}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "c" },
                windows: { modifiers: ["ctrl", "shift"], key: "c" },
              }}
            />
          </ActionPanel.Section>
          <Action
            icon={Icon.Cog}
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "," },
              windows: { modifiers: ["ctrl", "shift"], key: "," },
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function MemeDetail({ searchResult }: { searchResult: SearchResult }) {
  const memeUrl = searchResult.url;
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<MemeDetails | null>(null);

  useEffect(() => {
    if (!memeUrl) return;
    setIsLoading(true);
    (async () => {
      const result: MemeDetails | null = await getMeme(memeUrl);
      setData(result);
      setIsLoading(false);
    })();
  }, [memeUrl]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={data?.title}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={searchResult.url} />
            <Action.CopyToClipboard
              title="Copy URL"
              content={searchResult.url}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "c" },
                windows: { modifiers: ["ctrl", "shift"], key: "c" },
              }}
            />
          </ActionPanel.Section>
          <Action
            icon={Icon.Cog}
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "," },
              windows: { modifiers: ["ctrl", "shift"], key: "," },
            }}
          />
        </ActionPanel>
      }
      markdown={
        data
          ? `
# ${data?.title}

<img src="${data?.image.url}" alt="${escapeHtmlAttr(data?.image.alt)}" />

${data?.sections
  .map(
    (section) =>
      `## ${section.title}

${section.contents
  .map(
    (content) =>
      `${
        typeof content === "object" && content !== null
          ? typeof content.imageUrl === "string" &&
            (/^https:\/\/.*\.(png|jpe?g(_large)?|gif|webp|svg)$/.test(content.imageUrl) ||
              content.imageUrl.startsWith("https://i.kym-cdn.com/photos"))
            ? `<img src="${content.imageUrl}" alt="${escapeHtmlAttr(content.imageAlt)}" />

***
`
            : `(unsupported image) - ${content.imageAlt || "no alt text"}

***
`
          : content
      }

`,
  )
  .join("")}

`,
  )
  .join("")}
`
          : isLoading
            ? "## Loading..."
            : "# No data found"
      }
      metadata={data && <MemeDetailMetadata {...data} />}
    />
  );
}

function MemeDetailMetadata(meme: MemeDetails) {
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label icon={Icon.Eye} title="Views" text={meme.views?.toLocaleString() || "No Data"} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label icon={Icon.Box} title="Type" text={meme.type.join(", ") || "No Data"} />
      <Detail.Metadata.Label icon={Icon.Calendar} title="Year" text={`${meme.year}` || "No Data"} />
      <Detail.Metadata.Label icon={Icon.Compass} title="Origin" text={`${meme.origin}` || "No Data"} />
      <Detail.Metadata.Label icon={Icon.Pin} title="Region" text={`${meme.region}` || "No Data"} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Link title="Search Interest" target={meme.googleTrends} text="Google Trends" />
      <Detail.Metadata.Separator />
      <Detail.Metadata.TagList title="Tags">
        {meme.tags?.map((tag) => (
          <Detail.Metadata.TagList.Item key={tag} text={tag} />
        ))}
      </Detail.Metadata.TagList>
    </Detail.Metadata>
  );
}

interface SearchResult {
  name: string;
  url: string;
  image: string;
}
