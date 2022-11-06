import { Action, ActionPanel, Color, Detail, Grid, Icon, showInFinder, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getDownloadFolder, Pixabay, Video, VideoHit } from "./lib/api";
import { useImage } from "./lib/hooks";
import {
  capitalizeFirstLetter,
  compactNumberFormat,
  getErrorMessage,
  resolveFilepath,
  splitTagString,
} from "./lib/utils";
import fs from "fs";
import path from "path";

function getPreviewUrl(hit: VideoHit, size?: string): string {
  const s = size ? size : "295x166"; // Available sizes: 100x75, 200x150, 295x166, 640x360, 960x540, 1920x1080
  return `https://i.vimeocdn.com/video/${hit.picture_id}_${s}.jpg`;
}

function DownloadVideoAction(props: { video: Video | undefined; title: string; hit: VideoHit }): JSX.Element | null {
  const v = props.video;
  if (!v) {
    return null;
  }
  const hit = props.hit;
  const firstTag = hit.tags.split(",")[0];
  const filename = `${firstTag} - ${hit.id}.mp4`;
  const handle = async () => {
    await showToast({ style: Toast.Style.Animated, title: "Downloading" });
    try {
      const downloadFolder = getDownloadFolder();
      fs.mkdirSync(downloadFolder, { recursive: true });
      const downloadFilename = path.join(downloadFolder, filename);
      await Pixabay.downloadFile(v.url, { localFilepath: resolveFilepath(downloadFilename) });
      await showToast({ style: Toast.Style.Success, title: "Download succeeded", message: `${downloadFilename}` });
      await showInFinder(downloadFilename);
    } catch (error) {
      const e = getErrorMessage(error);
      await showToast({ style: Toast.Style.Failure, title: "Download failed", message: e });
    }
  };
  return (
    <Action
      title={`Download ${props.title} - ${v.width} x ${v.height}`}
      icon={{ source: Icon.Download, tintColor: Color.PrimaryText }}
      onAction={handle}
    />
  );
}

function VideoDetail(props: { hit: VideoHit }): JSX.Element {
  const hit = props.hit;
  const { base64, error } = useImage(getPreviewUrl(hit, "960x540"), hit.id.toString());
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not download Image", message: error });
  }
  const parts: string[] = [];
  if (base64) {
    parts.push(`![Preview](${base64})`);
  } else {
    parts.push("Download Video Preview ...");
  }
  const md = parts.join("\n");
  const tags = splitTagString(hit.tags);
  return (
    <Detail
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Author">
            <Detail.Metadata.TagList.Item text={hit.user} icon={hit.userImageURL} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Tags">
            {tags?.map((t) => (
              <Detail.Metadata.TagList.Item key={t} text={t} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Likes" text={`♥️ ${hit.likes}`} />
          <Detail.Metadata.Label title="Downloads" text={`${hit.downloads}`} />
          <Detail.Metadata.Label title="Views" text={`${hit.views}`} />
          <Detail.Metadata.Label title="Comments" text={`${hit.comments}`} />
          <Detail.Metadata.Link
            title="License"
            text="Pixabay License"
            target="https://pixabay.com/de/service/license"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={hit.pageURL} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Videos">
            {Object.entries(hit.videos).map(([k, v]) => (
              <DownloadVideoAction key={k} video={v} title={capitalizeFirstLetter(k)} hit={hit} />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function VideoGridItem(props: { hit: VideoHit }): JSX.Element {
  const hit = props.hit;
  return (
    <Grid.Item
      title={`♥️${compactNumberFormat(hit.likes)} ⬇️${compactNumberFormat(hit.downloads)} 👁️${compactNumberFormat(
        hit.views
      )}`}
      subtitle={hit.tags}
      content={getPreviewUrl(hit)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Video"
            target={<VideoDetail hit={hit} />}
            icon={{ source: Icon.Video, tintColor: Color.PrimaryText }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function SearchVideosCommand(): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, data } = useCachedPromise(
    async (searchText: string | undefined) => {
      const result = await Pixabay.searchVideos(searchText);
      return result;
    },
    [searchText],
    {
      keepPreviousData: true,
    }
  );
  return (
    <Grid isLoading={isLoading} throttle onSearchTextChange={setSearchText}>
      {data?.hits?.map((hit) => (
        <VideoGridItem key={hit.id} hit={hit} />
      ))}
      {!searchText && <Grid.EmptyView title="Enter query to search Videos on pixabay.com" icon={"pixabay.png"} />}
    </Grid>
  );
}
