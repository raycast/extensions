import { Detail } from "@raycast/api";
import type { ReactNode } from "react";
import { imageUrl, museumName, type Artwork } from "../lib/artworks";
import { ArtworkActions } from "./artwork-actions";

function escapeMarkdown(text: string) {
  return text.replace(/[\\`*_{}[\]()<>#+.!|~-]/g, "\\$&");
}

export function ArtworkDetail({
  artwork,
  onSearchColor,
  extraActions,
}: {
  artwork: Artwork;
  onSearchColor: (hex: string) => void;
  extraActions?: ReactNode;
}) {
  return (
    <Detail
      navigationTitle={artwork.title}
      markdown={`![${escapeMarkdown(artwork.title)}](${imageUrl(artwork)})\n\n# ${escapeMarkdown(artwork.title)}\n\n${escapeMarkdown(artwork.artist || "Artist unknown")}${artwork.date ? ` · ${escapeMarkdown(artwork.date)}` : ""}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Artist" text={artwork.artist || "Artist unknown"} />
          <Detail.Metadata.Label title="Date" text={artwork.date || "Date unknown"} />
          <Detail.Metadata.Link title="Source" text={museumName(artwork)} target={artwork.sourceUrl} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Palette · Select to Search">
            {artwork.palette.map((color, index) => (
              <Detail.Metadata.TagList.Item
                key={`${color.hex}-${index}`}
                text={`${color.hex} · ${color.share}%`}
                color={color.hex}
                onAction={() => onSearchColor(color.hex)}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Image Size" text={`${artwork.image.width} × ${artwork.image.height}`} />
          <Detail.Metadata.Label title="Rights" text="Public domain, as listed by Museum" />
        </Detail.Metadata>
      }
      actions={<ArtworkActions artwork={artwork} onSearchColor={onSearchColor} extraActions={extraActions} />}
    />
  );
}
