import { Grid, Action, ActionPanel, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import saveImage from "./functions/saveImage";
import copyFileToClipboard from "./functions/copyFileToClipboard";
import { setWallpaper } from "./functions/setWallpaper";
import DisplayArtwork from "./display-artwork";
import { useFetch } from "@raycast/utils";
import { Artwork } from "./types";
import { FRAME_CROP_API_URL } from "../config.json";

function GetPopularArt() {
  const { push } = useNavigation();

  const { data, error, isLoading, revalidate } = useFetch<Artwork[]>(`${FRAME_CROP_API_URL}/raycast/popular`, {
    method: "GET",
    headers: {
      Authorization: "FC-RAYCAST",
      "Content-Type": "application/json",
      "X-Extension-Origin": "raycast-extension",
    },
  });

  if (error) {
    showToast(Toast.Style.Failure, "Error fetching data", error.message);
    return null;
  }

  if (!Array.isArray(data)) {
    showToast(Toast.Style.Failure, "Unexpected data format", "Data is not an array");
    return null;
  }

  return (
    <Grid isLoading={isLoading} columns={4}>
      {data.length ? (
        data.map((artwork) => (
          <Grid.Item
            key={artwork.id}
            title={artwork.username}
            content={artwork.thumb_url}
            actions={
              <ActionPanel>
                <Action
                  title="View Artwork Details"
                  onAction={() => {
                    push(<DisplayArtwork artwork={artwork} />);
                  }}
                  icon={Icon.Eye}
                />
                <Action
                  title="Set Desktop Wallpaper"
                  onAction={() => {
                    setWallpaper({ url: artwork.full_url, id: artwork.username });
                  }}
                  icon={Icon.Monitor}
                />
                <Action
                  title="Copy to Clipboard"
                  onAction={() => copyFileToClipboard({ url: artwork.full_url, id: artwork.username })}
                  icon={Icon.CopyClipboard}
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
                <Action title="Reload" onAction={() => revalidate()} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <Grid.EmptyView icon={Icon.XMarkCircle} title="Uh oh!, No artworks yet." />
      )}
    </Grid>
  );
}

export default GetPopularArt;
