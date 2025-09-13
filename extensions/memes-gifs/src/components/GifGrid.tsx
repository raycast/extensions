import { useState } from "react";
import { ActionPanel, Action, Grid, Clipboard, showToast, Toast, closeMainWindow } from "@raycast/api";
import { Gif } from "../types";
import { copyImageToClipboard } from "../utils/appleScript";

interface GifGridProps {
  randomGifs: Gif[];
  allGifs: Gif[];
  searchText: string;
  isSearchLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onSearchTextChange: (text: string) => void;
  onFetchNextPage: () => void;
  onRefetchRandomGifs: () => void;
}

export function GifGrid({
  randomGifs,
  allGifs,
  searchText,
  isSearchLoading,
  hasNextPage,
  isFetchingNextPage,
  onSearchTextChange,
  onFetchNextPage,
  onRefetchRandomGifs,
}: GifGridProps) {
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

  const copyGifDirectly = async (gifUrl: string) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Copying GIF...",
        message: "Processing and copying to clipboard",
      });

      await copyImageToClipboard(gifUrl);

      await showToast({
        style: Toast.Style.Success,
        title: "GIF Copied!",
        message: "GIF has been copied to your clipboard",
      });

      // Wait 100ms to ensure toast is visible before closing
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Close the Raycast overlay completely after successful copy
      await closeMainWindow();
    } catch (error) {
      console.error("Failed to copy GIF:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Copy GIF",
        message: "Could not copy GIF to clipboard. Try copying the URL instead.",
      });
    }
  };

  return (
    <Grid
      columns={allGifs.length === 0 && searchText === "" ? 3 : columns}
      inset={Grid.Inset.Small}
      isLoading={isSearchLoading}
      onSearchTextChange={onSearchTextChange}
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
                  <Action title="Copy Gif" onAction={() => copyGifDirectly(gif.url)} />
                  <Action title="Copy Gif URL" onAction={() => Clipboard.copy(gif.url)} />
                  <Action title="Copy Markdown" onAction={() => Clipboard.copy(`![](${gif.url})`)} />
                  <Action.OpenInBrowser url={gif.url} title="Open in Browser" />
                  <Action title="Download Gif" onAction={() => downloadGif(gif.url)} />
                  <Action title="New Random Gifs" onAction={() => onRefetchRandomGifs()} />
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
                  <Action title="Copy Gif" onAction={() => copyGifDirectly(gif.url)} />
                  <Action title="Copy Gif URL" onAction={() => Clipboard.copy(gif.url)} />
                  <Action title="Copy Markdown" onAction={() => Clipboard.copy(`![](${gif.url})`)} />
                  <Action.OpenInBrowser url={gif.url} title="Open in Browser" />
                  <Action title="Download Gif" onAction={() => downloadGif(gif.url)} />
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
                    onAction={() => onFetchNextPage()}
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
