import { Detail, Action, ActionPanel, Icon } from "@raycast/api";
import saveImage from "./functions/saveImage";
import copyFileToClipboard from "./functions/copyFileToClipboard";
import { setWallpaper } from "./functions/setWallpaper";
import { Artwork } from "./types";
import { capitalizeFirstChar } from "./functions/utils";

interface DisplayArtworkProps {
  artwork: Artwork;
  onRefresh?: () => void;
}

const DisplayArtwork = ({ artwork, onRefresh }: DisplayArtworkProps) => {
  return (
    <Detail
      markdown={`![Artwork](${artwork.full_url})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Artist" text={artwork.username} />
          <Detail.Metadata.Link
            title={`${artwork.source === "unsplash" ? "Profile" : "Artwork info"}`}
            text={`${artwork.source === "unsplash" ? "View Profile" : "View artwork info"}`}
            target={artwork.profile_link}
          />
          <Detail.Metadata.TagList title="Quality">
            <Detail.Metadata.TagList.Item
              text={artwork.quality}
              color={artwork.quality === "4K" ? "green" : "orange"}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Source" text={capitalizeFirstChar(artwork.source)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {onRefresh && <Action title="Fetch a Random Artwork" onAction={onRefresh} icon={Icon.RotateClockwise} />}
          <Action
            title="Copy to Clipboard"
            onAction={() => copyFileToClipboard({ url: artwork.full_url, id: artwork.username })}
            icon={Icon.CopyClipboard}
          />
          <Action
            title="Set Desktop Wallpaper"
            onAction={() => {
              setWallpaper({ url: artwork.full_url, id: artwork.username });
            }}
            icon={Icon.Monitor}
          />
          <Action
            title="Download Full"
            onAction={() => saveImage({ url: artwork.full_url, id: artwork.username, mode: "original" })}
            icon={Icon.Download}
          />
          <Action
            title="Download Landscape 4K"
            onAction={() => saveImage({ url: artwork.full_url, id: artwork.username, mode: "landscape" })}
            icon={Icon.Download}
          />
          <Action
            title="Download Portrait 4K"
            onAction={() => saveImage({ url: artwork.full_url, id: artwork.username, mode: "portrait" })}
            icon={Icon.Download}
          />
        </ActionPanel>
      }
    />
  );
};

export default DisplayArtwork;
