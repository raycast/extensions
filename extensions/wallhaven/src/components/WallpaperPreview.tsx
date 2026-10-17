import { Detail } from "@raycast/api";
import { Wallpaper } from "../types";
import { formatFileSize, purityColor } from "../utils";

export function WallpaperPreview({
  wallpaper,
  actions,
}: {
  wallpaper: Wallpaper;
  actions: React.ComponentProps<typeof Detail>["actions"];
}) {
  const markdown = `![${wallpaper.id}](${wallpaper.thumbs.original})`;

  return (
    <Detail
      navigationTitle="Wallpaper Preview"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="ID" text={wallpaper.id} />
          <Detail.Metadata.Label
            title="Resolution"
            text={wallpaper.resolution}
          />
          <Detail.Metadata.Label
            title="File Size"
            text={formatFileSize(wallpaper.file_size)}
          />
          <Detail.Metadata.Label title="File Type" text={wallpaper.file_type} />
          <Detail.Metadata.Label title="Category" text={wallpaper.category} />
          <Detail.Metadata.TagList title="Purity">
            <Detail.Metadata.TagList.Item
              text={wallpaper.purity.toUpperCase()}
              color={purityColor(wallpaper.purity)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Views" text={String(wallpaper.views)} />
          <Detail.Metadata.Label
            title="Favorites"
            text={String(wallpaper.favorites)}
          />
          <Detail.Metadata.Label title="Uploaded" text={wallpaper.created_at} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Colors">
            {wallpaper.colors.map((color) => (
              <Detail.Metadata.TagList.Item
                key={color}
                text={color}
                color={color}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Link
            title="Wallhaven"
            text="Open Page"
            target={wallpaper.url}
          />
        </Detail.Metadata>
      }
      actions={actions}
    />
  );
}
