import { Action, ActionPanel, AI, environment, Grid, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { createApiClient, type ImageSource } from "../api";

const IMAGE_SOURCE_LABEL: Record<ImageSource, string> = {
  UNSPLASH: "Unsplash",
  PEXELS: "Pexels",
  FLICKR: "Flickr",
};

interface ImagePickerProps {
  initialSearchText: string;
  onSelect: (imageUrl: string) => void;
}

async function generateSearchPrompt(text: string): Promise<string> {
  const prompt = `Given the word/phrase "${text}" (which someone is learning), generate a short English image search query (2-4 words) that would help memorize this word. Do not include words like "photo", "image", or "picture". Return ONLY the search query, nothing else.`;
  return AI.ask(prompt, {
    creativity: "low",
  });
}

export function ImagePicker({ initialSearchText, onSelect }: ImagePickerProps) {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState(initialSearchText);
  const [source, setSource] = useState<ImageSource | "ALL">("ALL");

  const hasRaycastAI = environment.canAccess(AI);

  const { data, isLoading } = useCachedPromise(
    async (query: string, imageSource: ImageSource | "ALL") => {
      if (!query || query.length < 2) return null;

      const client = createApiClient();
      const resolvedSource = imageSource === "ALL" ? undefined : imageSource;

      if (hasRaycastAI && query === initialSearchText) {
        try {
          const searchPrompt = await generateSearchPrompt(query);
          return client.images.searchImages({
            text: query,
            searchPrompt: searchPrompt.trim(),
            source: resolvedSource,
            size: "normal",
            pageSize: 30,
          });
        } catch {
          // Fall through to search without AI enhancement
        }
      }

      return client.images.searchImages({
        text: query,
        source: resolvedSource,
        size: "normal",
        pageSize: 30,
      });
    },
    [searchText, source],
    {
      execute: searchText.length >= 2,
      keepPreviousData: true,
    },
  );

  const resolvedSourceName = data?.source !== undefined ? IMAGE_SOURCE_LABEL[data.source] : "Unknown";

  async function handleSelect(selectedUrl: string) {
    const selectedImage = data?.results.find((img) => img.url === selectedUrl);
    if (selectedImage?.downloadTrackingUrl) {
      const client = createApiClient();
      client.images.trackDownload(selectedImage.downloadTrackingUrl).catch(() => {});
    }
    onSelect(selectedUrl);
    await showToast({ style: Toast.Style.Success, title: "Image selected" });
    pop();
  }

  return (
    <Grid
      columns={5}
      aspectRatio="3/2"
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search images..."
      navigationTitle="Search Images"
      throttle
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Image Source"
          value={source}
          onChange={(value) => {
            setSource(value as ImageSource | "ALL");
          }}
        >
          <Grid.Dropdown.Item title="All Sources" value="ALL" icon={Icon.MagnifyingGlass} />
          <Grid.Dropdown.Item title="Unsplash" value="UNSPLASH" icon={Icon.Image} />
          <Grid.Dropdown.Item title="Pexels" value="PEXELS" icon={Icon.Camera} />
          <Grid.Dropdown.Item title="Flickr" value="FLICKR" icon={Icon.Globe} />
        </Grid.Dropdown>
      }
    >
      {data?.results && data.results.length > 0 ? (
        data.results.map((image, index) => (
          <Grid.Item
            key={`${source}-${index}`}
            content={image.url}
            title={
              image.attribution ? `${image.attribution.photographerName} / ${resolvedSourceName}` : `Image ${index + 1}`
            }
            actions={
              <ActionPanel>
                <Action title="Select Image" icon={Icon.CheckCircle} onAction={() => handleSelect(image.url)} />
                {image.attribution && (
                  <>
                    <Action.OpenInBrowser
                      title={`View Photographer on ${resolvedSourceName}`}
                      url={image.attribution.photographerUrl}
                      shortcut={{ modifiers: ["opt"], key: "p" }}
                    />
                    <Action.OpenInBrowser
                      title={`View Photo on ${resolvedSourceName}`}
                      url={image.attribution.photoUrl}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                  </>
                )}
                <Action.OpenInBrowser
                  title="Open Image URL"
                  url={image.url}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={image.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      ) : !isLoading ? (
        <Grid.EmptyView
          icon={Icon.Image}
          title={searchText.length < 2 ? "Start typing to search" : "No images found"}
          description={searchText.length < 2 ? "Enter at least 2 characters" : "Try a different search term or source"}
        />
      ) : null}
    </Grid>
  );
}
