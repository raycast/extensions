import { Grid, Detail, Action, ActionPanel, Icon } from "@raycast/api";
import { sbData } from "./utils/storyblokData";
import { asset } from "./utils/types";
import { formatBytes } from "./utils/helpers";

type assetData = {
  isLoading: boolean;
  data: {
    assets: asset[];
  };
};

function getFilename(filename: string) {
  const fileArray = filename.split("/");
  return fileArray[fileArray.length - 1];
}

export default function AssetList(props: { spaceId: number }) {
  const data = sbData(`spaces/${props.spaceId}/assets`) as assetData;

  if (data.isLoading) {
    return <Detail isLoading={data.isLoading} markdown={`Loading...`} />;
  } else if (data.isLoading === false && data.data === undefined) {
    return (
      <Grid>
        <Grid.EmptyView title="No Assets found." icon={Icon.Image} />
      </Grid>
    );
  } else {
    if (data.data.assets.length === 0) {
      return (
        <Grid>
          <Grid.EmptyView title="No assets found" description="No assets found in this space." />
        </Grid>
      );
    } else {
      return (
        <Grid columns={4}>
          {data.data.assets.map((asset: asset) => (
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
}
