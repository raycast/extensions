import { useState, useMemo } from "react";
import { Grid, ActionPanel, Action, Icon, Color, Keyboard } from "@raycast/api";
import { ImageAsset, ImageAssetType } from "../types";
import { resolveUrl } from "../utils/urlUtils";

interface ImagesGridViewProps {
  images: ImageAsset[];
  siteUrl: string;
}

function getTypeLabel(type: ImageAssetType): string {
  switch (type) {
    case "favicon":
      return "Favicon";
    case "apple-touch-icon":
      return "Apple Touch Icon";
    case "mask-icon":
      return "Mask Icon";
    case "og":
      return "Open Graph";
    case "twitter":
      return "Twitter Card";
    case "msapplication":
      return "MS Tile";
    case "json-ld":
      return "JSON-LD";
    case "manifest-icon":
      return "Manifest Icon";
    case "manifest-screenshot":
      return "Screenshot";
    case "manifest-shortcut":
      return "Shortcut Icon";
    default:
      return type;
  }
}

function getTypeIcon(type: ImageAssetType): { source: Icon; tintColor: Color } {
  switch (type) {
    case "favicon":
    case "apple-touch-icon":
    case "mask-icon":
      return { source: Icon.AppWindowGrid2x2, tintColor: Color.Blue };
    case "og":
      return { source: Icon.Image, tintColor: Color.Orange };
    case "twitter":
      return { source: Icon.Bird, tintColor: Color.Blue };
    case "msapplication":
      return { source: Icon.Window, tintColor: Color.Purple };
    case "json-ld":
      return { source: Icon.Code, tintColor: Color.Green };
    case "manifest-icon":
      return { source: Icon.Document, tintColor: Color.Yellow };
    case "manifest-screenshot":
      return { source: Icon.Monitor, tintColor: Color.Magenta };
    case "manifest-shortcut":
      return { source: Icon.Link, tintColor: Color.Yellow };
    default:
      return { source: Icon.Image, tintColor: Color.SecondaryText };
  }
}

function deduplicateImages(images: ImageAsset[]): ImageAsset[] {
  const seen = new Map<string, ImageAsset>();
  for (const img of images) {
    if (!seen.has(img.src)) {
      seen.set(img.src, img);
    }
  }
  return Array.from(seen.values());
}

export function ImagesGridView({ images, siteUrl }: ImagesGridViewProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const uniqueImages = useMemo(() => deduplicateImages(images), [images]);

  // Get available types from the images
  const availableTypes = useMemo(() => {
    const types = new Set<ImageAssetType>();
    for (const img of uniqueImages) {
      types.add(img.type);
    }
    return Array.from(types);
  }, [uniqueImages]);

  // Filter images by selected type
  const filteredImages = useMemo(() => {
    if (typeFilter === "all") return uniqueImages;
    return uniqueImages.filter((img) => img.type === typeFilter);
  }, [uniqueImages, typeFilter]);

  return (
    <Grid
      navigationTitle={`Images (${filteredImages.length})`}
      searchBarPlaceholder="Filter images..."
      columns={4}
      inset={Grid.Inset.Medium}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Type" storeValue onChange={setTypeFilter}>
          <Grid.Dropdown.Item title="All Types" value="all" />
          <Grid.Dropdown.Section title="Types">
            {availableTypes.map((type) => (
              <Grid.Dropdown.Item key={type} title={getTypeLabel(type)} value={type} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {filteredImages.map((img, index) => {
        const absoluteUrl = resolveUrl(img.src, siteUrl);
        const urlWithoutQuery = absoluteUrl.split("?")[0];
        const filename = urlWithoutQuery.split("/").pop() || img.src;
        const subtitle = getTypeLabel(img.type) + (img.sizes ? ` • ${img.sizes}` : "");

        return (
          <Grid.Item
            key={index}
            content={{
              source: absoluteUrl,
              fallback: getTypeIcon(img.type).source,
            }}
            title={filename.length > 30 ? filename.slice(0, 27) + "..." : filename}
            subtitle={subtitle}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Image" url={absoluteUrl} shortcut={Keyboard.Shortcut.Common.Open} />
                <Action.CopyToClipboard
                  title="Copy Image URL"
                  content={absoluteUrl}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.OpenInBrowser title="Open Site" url={siteUrl} icon={Icon.Globe} />
              </ActionPanel>
            }
          />
        );
      })}

      {filteredImages.length === 0 && <Grid.EmptyView title="No images found" icon={Icon.Image} />}
    </Grid>
  );
}

/** Get unique image count from an array of images */
export function getUniqueImageCount(images: ImageAsset[] | undefined): number {
  if (!images || images.length === 0) return 0;
  const seen = new Set<string>();
  for (const img of images) {
    seen.add(img.src);
  }
  return seen.size;
}
