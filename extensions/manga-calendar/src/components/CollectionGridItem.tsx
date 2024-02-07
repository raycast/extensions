import { CollectionListView } from "@components/CollectionListView";
import { Action, ActionPanel, Color, Grid } from "@raycast/api";
import { Collection } from "@types";

interface Props {
  collection: Collection;
}

export default function CollectionGridItem({ collection: { name, url, frontImageUrl } }: Props) {
  return (
    <Grid.Item
      title={name}
      content={{ source: frontImageUrl, fallback: Color.Blue }}
      actions={
        <ActionPanel>
          <Action.Push
            title={name}
            target={<CollectionListView title={name} url={"https://miscomics.com.mx" + url} />}
          />
        </ActionPanel>
      }
    />
  );
}
