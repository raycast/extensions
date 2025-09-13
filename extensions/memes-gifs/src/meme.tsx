import { useState } from "react";
import { ActionPanel, Action, Grid, Clipboard, showToast, Toast } from "@raycast/api";
import { useQuery, useInfiniteQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import fetch from "node-fetch";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const queryClient = new QueryClient();

// Get API key from environment variables
const TENOR_API_KEY = process.env.TENOR_API_KEY;

if (!TENOR_API_KEY) {
  throw new Error("TENOR_API_KEY environment variable is required. Please create a .env file with your Tenor API key.");
}

interface Gif {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
}

interface TenorResult {
  id: string;
  content_description: string;
  media_formats: {
    gif: { url: string };
    tinygif: { url: string };
    nanogif: { url: string };
  };
}

interface TenorResponse {
  results: TenorResult[];
  next: string;
}

function MemeCommand() {
  const [searchText, setSearchText] = useState("");
  const [columns, setColumns] = useState(5);

  const downloadGif = async (gifUrl: string) => {
    try {
      // Open the GIF URL in browser for download
      await Action.OpenInBrowser({ url: gifUrl });
      await showToast({
        style: Toast.Style.Success,
        title: "Opening GIF for download",
        message: "Right-click and 'Save As' to download",
      });
    } catch (error) {
      console.error("Failed to open GIF:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open GIF",
        message: "Could not open the GIF in browser",
      });
    }
  };

  // Fetch random GIFs
  const { data: randomGifs = [], refetch: refetchRandomGifs } = useQuery({
    queryKey: ["randomGifs"],
    queryFn: async (): Promise<Gif[]> => {
      const response = await fetch(
        `https://tenor.googleapis.com/v2/search?q=meme&key=${TENOR_API_KEY}&limit=3&random=true`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = (await response.json()) as TenorResponse;
      return json.results.map((result) => ({
        id: result.id,
        title: result.content_description,
        url: result.media_formats.gif.url,
        previewUrl: result.media_formats.nanogif.url,
      }));
    },
  });

  // Fetch search results with infinite query
  const {
    data: searchData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isSearchLoading,
  } = useInfiniteQuery({
    queryKey: ["searchGifs", searchText],
    queryFn: async ({ pageParam = "" }): Promise<{ gifs: Gif[]; nextPos: string | null }> => {
      const url = pageParam
        ? `https://tenor.googleapis.com/v2/search?q=${searchText}&key=${TENOR_API_KEY}&limit=10&pos=${pageParam}`
        : `https://tenor.googleapis.com/v2/search?q=${searchText}&key=${TENOR_API_KEY}&limit=10`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = (await response.json()) as TenorResponse;
      const gifs: Gif[] = json.results.map((result) => ({
        id: result.id,
        title: result.content_description,
        url: result.media_formats.gif.url,
        previewUrl: result.media_formats.tinygif.url,
      }));
      return { gifs, nextPos: json.next };
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextPos,
    enabled: searchText.length > 0,
  });

  const allGifs = searchData?.pages.flatMap((page) => page.gifs) ?? [];

  return (
    <Grid
      columns={allGifs.length === 0 && searchText === "" ? 3 : columns}
      inset={Grid.Inset.Small}
      isLoading={isSearchLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for memes and GIFs..."
      fit={Grid.Fit.Fill}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
          }}
        >
          <Grid.Dropdown.Item title="Large" value={"3"} />
          <Grid.Dropdown.Item title="Medium" value={"5"} />
          <Grid.Dropdown.Item title="Small" value={"8"} />
        </Grid.Dropdown>
      }
    >
      {allGifs.length === 0 && searchText === "" ? (
        randomGifs.length > 0 ? (
          randomGifs.map((gif) => (
            <Grid.Item
              key={gif.id}
              content={{ tooltip: gif.title, source: gif.previewUrl }}
              title="Start typing to search for more!"
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={gif.url} title="Open in Browser" />
                  <Action title="Download Gif" onAction={() => downloadGif(gif.url)} />
                  <Action title="Copy Gif URL" onAction={() => Clipboard.copy(gif.url)} />
                  <Action title="Copy Markdown" onAction={() => Clipboard.copy(`![](${gif.url})`)} />
                  <Action title="New Random Gifs" onAction={() => refetchRandomGifs()} />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <Grid.Item
            content={{ source: "https://via.placeholder.com/400x200/4A90E2/FFFFFF?text=Loading+Random+GIFs..." }}
            title="Loading..."
            subtitle="Fetching random GIFs for you!"
          />
        )
      ) : (
        <>
          {allGifs.map((gif) => (
            <Grid.Item
              key={gif.id}
              content={{ tooltip: gif.title, source: gif.previewUrl }}
              actions={
                <ActionPanel>
                  <Action title="Copy Gif URL" onAction={() => Clipboard.copy(gif.url)} />
                  <Action title="Download Gif" onAction={() => downloadGif(gif.url)} />
                  <Action.OpenInBrowser url={gif.url} title="Open in Browser" />
                  <Action title="Copy Markdown" onAction={() => Clipboard.copy(`![](${gif.url})`)} />
                </ActionPanel>
              }
            />
          ))}
          {hasNextPage && (
            <Grid.Item
              content={{
                source: isFetchingNextPage
                  ? "https://via.placeholder.com/200x200/FFA500/FFFFFF?text=Loading..."
                  : "https://via.placeholder.com/200x200/4A90E2/FFFFFF?text=Load+More",
              }}
              title={isFetchingNextPage ? "Loading..." : "Load More"}
              subtitle={isFetchingNextPage ? "Fetching more GIFs..." : "Click to load more GIFs"}
              actions={
                <ActionPanel>
                  <Action
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title={isFetchingNextPage ? "Loading More Gifs..." : "Load More Gifs"}
                    onAction={() => fetchNextPage()}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </Grid>
  );
}

export default function Command() {
  return (
    <QueryClientProvider client={queryClient}>
      <MemeCommand />
    </QueryClientProvider>
  );
}
