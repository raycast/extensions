import { Action, ActionPanel, Color, Detail, Grid, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Hit, Pixabay } from "./lib/api";
import { useImage } from "./lib/hooks";

function ImageDetail(props: { hit: Hit }): JSX.Element {
  const hit = props.hit;
  const { localFilepath, error } = useImage(hit.largeImageURL, hit.id.toString());
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Could not download Image", message: error });
  }
  const parts: string[] = [];
  if (localFilepath) {
    parts.push(`![Preview](${localFilepath})`);
  } else {
    parts.push("Download Image ...");
  }
  const md = parts.join("\n");
  return (
    <Detail
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Author">
            <Detail.Metadata.TagList.Item text={hit.user} icon={hit.userImageURL} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Size" text={`${hit.imageWidth} x ${hit.imageHeight}`} />
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
          <Action.OpenInBrowser url={hit.pageURL} />
        </ActionPanel>
      }
    />
  );
}

function ImageGridItem(props: { hit: Hit }): JSX.Element {
  const hit = props.hit;
  return (
    <Grid.Item
      title={hit.tags}
      content={hit.previewURL}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Image"
            target={<ImageDetail hit={hit} />}
            icon={{ source: Icon.Image, tintColor: Color.PrimaryText }}
          />
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
