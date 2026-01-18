import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useImages, portainerApi } from "./hooks/usePortainer";
import { DockerImage } from "./api/types";
import { DEFAULT_ICONS } from "./utils/constants";
import {
  formatBytes,
  formatRelativeTime,
  formatImageName,
  getImageRepository,
  getImageTag,
  formatShortId,
  getPortainerWebUrl,
} from "./utils/helpers";

export default function ImagesCommand() {
  const { data: images, isLoading, revalidate } = useImages();

  // Sort images by created date (newest first)
  const sortedImages = images?.sort((a, b) => b.Created - a.Created);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search images...">
      {sortedImages?.map((image) => (
        <ImageListItem key={image.Id} image={image} revalidate={revalidate} />
      ))}
    </List>
  );
}

function ImageListItem({
  image,
  revalidate,
}: {
  image: DockerImage;
  revalidate: () => void;
}) {
  const repository = getImageRepository(image);
  const tag = getImageTag(image);
  const fullName = formatImageName(image);
  const shortId = formatShortId(image.Id.replace("sha256:", ""));

  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: tag,
        color: tag === "latest" ? Color.Blue : Color.SecondaryText,
      },
    },
    {
      text: formatBytes(image.Size),
    },
    {
      text: formatRelativeTime(image.Created),
    },
  ];

  return (
    <List.Item
      title={repository}
      subtitle={shortId}
      icon={{ source: DEFAULT_ICONS.image, tintColor: Color.Blue }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Image Name"
              content={fullName}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Image Id"
              content={image.Id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.OpenInBrowser
              title="Open in Portainer"
              url={getPortainerWebUrl(
                portainerApi.getPortainerUrl(),
                portainerApi.getEndpointIdSync(),
                "image",
                image.Id,
              )}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
