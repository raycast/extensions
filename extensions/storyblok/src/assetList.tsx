import { Grid, Action, ActionPanel } from "@raycast/api";
import { useStoryblokDataPaginated } from "./utils/storyblokData";
import { asset } from "./utils/types";
import { formatBytes } from "./utils/helpers";

function getFilename(filename: string) {
  const fileArray = filename.split("/");
  return fileArray[fileArray.length - 1];
}

export default function AssetList(props: { spaceId: number }) {
  const data = useStoryblokDataPaginated<asset>(`spaces/${props.spaceId}/assets`);

  if (!data.isLoading && data.data.length === 0) {
    return (
      <Grid>
        <Grid.EmptyView title="No assets found" description="No assets found in this space." />
      </Grid>
    );
  } else {
    return (
      <Grid columns={4} pagination={data.pagination} isLoading={data.isLoading}>
        {data.data.map((asset: asset) => (
          <Grid.Item
            key={asset.id}
            content={asset.filename}
            title={getFilename(asset.filename)}
            keywords={asset.alt ? [asset.alt] : []}
            subtitle={`${asset.content_type.split("/")[1]} - ${formatBytes(asset.content_length)}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Browser" url={asset.filename} />
                <Action.CopyToClipboard title="Copy URL" content={asset.filename} />
              </ActionPanel>
            }
          />
        ))}
      </Grid>
    );
  }
}
