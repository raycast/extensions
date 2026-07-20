import { ReactElement, useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Grid, Icon, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Gif, Preferences, searchGifs } from "./klipy";
import { copyGifFile, downloadGif } from "./actions";

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Debounce so we don't fire a request on every keystroke.
    const handle = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      searchGifs(searchText, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) setGifs(results);
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setGifs([]);
          showFailureToast(error, { title: "Could not load GIFs" });
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 300);

    return () => clearTimeout(handle);
  }, [searchText]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const columns = parseInt(prefs.gridColumns ?? "4", 10);

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search Klipy for GIFs..."
    >
      {!isLoading && gifs.length === 0 ? (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No GIFs found" : "Start typing to search Klipy"}
          description={
            searchText
              ? "Try a different search term."
              : "Results appear as you type. Trending GIFs load by default."
          }
        />
      ) : (
        gifs.map((gif) => (
          <Grid.Item
            key={gif.id}
            content={{ source: gif.previewUrl }}
            title={gif.title}
            actions={<GifActions gif={gif} primaryAction={prefs.primaryAction} />}
          />
        ))
      )}
    </Grid>
  );
}

function GifActions({
  gif,
  primaryAction,
}: {
  gif: Gif;
  primaryAction: Preferences["primaryAction"];
}) {
  const actions: Record<Preferences["primaryAction"], ReactElement> = {
    copyGifUrl: (
      <Action.CopyToClipboard
        key="copyGifUrl"
        title="Copy GIF URL"
        content={gif.gifUrl}
        icon={Icon.Link}
      />
    ),
    copyGifFile: (
      <Action
        key="copyGifFile"
        title="Copy GIF File"
        icon={Icon.Clipboard}
        onAction={() => copyGifFile(gif)}
      />
    ),
    copyMarkdown: (
      <Action.CopyToClipboard
        key="copyMarkdown"
        title="Copy Markdown"
        content={`![${gif.title}](${gif.gifUrl})`}
        icon={Icon.Text}
      />
    ),
    pasteGifUrl: (
      <Action.Paste key="pasteGifUrl" title="Paste GIF URL" content={gif.gifUrl} icon={Icon.Link} />
    ),
    openInBrowser: (
      <Action.OpenInBrowser key="openInBrowser" url={gif.pageUrl} title="Open GIF in Browser" />
    ),
  };

  // Every action is available; the preferred one is promoted to the top (Enter).
  const order: Preferences["primaryAction"][] = [
    primaryAction,
    ...(
      ["copyGifUrl", "copyGifFile", "copyMarkdown", "pasteGifUrl", "openInBrowser"] as const
    ).filter((a) => a !== primaryAction),
  ];

  return (
    <ActionPanel>
      <ActionPanel.Section>{order.map((key) => actions[key])}</ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Download GIF"
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={() => downloadGif(gif)}
        />
        <Action.CopyToClipboard
          title="Copy HTML"
          content={`<img src="${gif.gifUrl}" alt="${gif.title}" />`}
          icon={Icon.Code}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
