import { ActionPanel, Action, Grid, Detail, LocalStorage, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ShazamMediaList } from "./listen";

export default function Command() {
  const { isLoading, data, error } = usePromise(async () => {
    // get list of media from local storage (stored as an array of ShazamMedia objects)
    const storage = LocalStorage.getItem<string>("shazam-library").then((value) => {
      return value == undefined ? ([] as ShazamMediaList) : (JSON.parse(value!) as ShazamMediaList);
    });

    return storage;
  });

  return isLoading ? (
    <Detail isLoading={true} markdown={""} />
  ) : // if media is null show error
  error ? (
    <Detail isLoading={false} markdown={"## " + error.name + "\n\n" + error.message + "\n\n" + error.stack} />
  ) : (
    <Grid
      columns={5}
      inset={Grid.Inset.Zero}
      filtering={true}
      //   onSearchTextChange={setSearchText}
      navigationTitle="Library"
      searchBarPlaceholder="Search media in library"
    >
      {data!.map((item) => (
        <Grid.Item
          key={item.scannedAt}
          content={{ source: item.artwork.toString() }}
          title={item.title}
          subtitle={item.artist}
          actions={
            <ActionPanel title={item?.title + " by " + item?.artist}>
              <Action title="Open in Apple Music" onAction={() => open(item?.appleMusicUrl.toString())} />
              <Action.CopyToClipboard content={item?.appleMusicUrl.toString()} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
