import { Action, ActionPanel, Color, Detail, Grid, Icon, showInFinder, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getDownloadFolder, Hit, Pixabay } from "./lib/api";
import fs from "fs";
import { useImage } from "./lib/hooks";
import path from "path";
import { compactNumberFormat, getErrorMessage, splitTagString } from "./lib/utils";

function getLargeFileExtension(hit: Hit): string {
  const last = hit.largeImageURL.split(".").slice(-1)[0];
  if (last && last.length > 0) {
    return last;
  } else {
    return "png";
  }
}

function ImagePageOpenInBrowserAction(props: { hit: Hit }): JSX.Element {
  return <Action.OpenInBrowser url={props.hit.pageURL} />;
}

function ImageDownloadAction(props: { localFilepath: string | undefined; hit: Hit }): JSX.Element | null {
  const hit = props.hit;
  const lfp = props.localFilepath;
  if (!lfp || !fs.existsSync(lfp)) {
    return null;
  }
  const handle = async () => {
    await showToast({ style: Toast.Style.Animated, title: "Downloading" });
    try {
      const [firsttag] = hit.tags.split(",");
      const filename = `${firsttag} - ${hit.id}.${getLargeFileExtension(hit)}`;
      const downloadFolder = getDownloadFolder();
      fs.mkdirSync(downloadFolder, { recursive: true });
      const localFilename = path.join(downloadFolder, filename);
      fs.copyFileSync(lfp, localFilename);
      await showToast({ style: Toast.Style.Success, title: "Download Succeeded", message: localFilename });
      await showInFinder(localFilename);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Download Failed", message: getErrorMessage(error) });
    }
  };
  return (
    <Action
      title={`Download Image - ${hit.imageWidth} x ${hit.imageHeight}`}
      onAction={handle}
      icon={{ source: Icon.Download, tintColor: Color.PrimaryText }}
    />
  );
}

function ImageDetail(props: { hit: Hit }): JSX.Element {
  const hit = props.hit;
  const { base64, localFilepath, error } = useImage(hit.largeImageURL, hit.id.toString());
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not download Image", message: error });
  }
  const parts: string[] = [];
  if (base64) {
    parts.push(`![Preview](${base64})`);
  } else {
    parts.push("Download Image ...");
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
          <Detail.Metadata.Label title="Size" text={`${hit.imageWidth} x ${hit.imageHeight}`} />
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
          <ImagePageOpenInBrowserAction hit={hit} />
          <ImageDownloadAction localFilepath={localFilepath} hit={hit} />
        </ActionPanel>
      }
    />
  );
}

function ImageGridItem(props: { hit: Hit }): JSX.Element {
  const hit = props.hit;
  return (
    <Grid.Item
      title={`♥️${compactNumberFormat(hit.likes)} ⬇️${compactNumberFormat(hit.downloads)} 👁️${compactNumberFormat(
        hit.views
      )}`}
      subtitle={hit.tags}
      content={hit.previewURL}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Image"
            target={<ImageDetail hit={hit} />}
            icon={{ source: Icon.Image, tintColor: Color.PrimaryText }}
          />
          <ImagePageOpenInBrowserAction hit={hit} />
        </ActionPanel>
      }
    />
  );
}

export default function SearchCommand(): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, data } = useCachedPromise(
    async (searchText: string | undefined) => {
      const result = await Pixabay.searchImages(searchText);
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
        <ImageGridItem key={hit.id} hit={hit} />
      ))}
      {!searchText && <Grid.EmptyView title="Enter query to search Images on pixabay.com" icon={"pixabay.png"} />}
    </Grid>
  );
}
