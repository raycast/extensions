import { Action, ActionPanel, Detail, LocalStorage, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { shazam } from "swift:../swift";

export type ShazamMedia = {
  scannedAt: number | null;
  title: string;
  subtitle: string;
  artist: string;
  genres: [string];
  creationDate: Date;
  artwork: URL;
  appleMusicUrl: URL;
};

export type ShazamMediaList = ShazamMedia[];

export default function Command() {
  const { isLoading, data, error } = usePromise(async () => {
    const media: ShazamMedia = await shazam();

    // TODO: uncomment this until the swift permissions are done
    // const media: ShazamMedia = {
    //   scannedAt: new Date().getTime(),
    //   title: "Dona Nobis Pacem 2",
    //   subtitle: "Song",
    //   artist: "Mari Samuelsen",
    //   genres: ["Classical"],
    //   creationDate: new Date(),
    //   artwork: new URL("https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/b6/ad/00/b6ad00a1-e180-dd2a-2a4e-0905454b2de8/18UMGIM39165.rgb.jpg/632x632bb.webp"),
    //   appleMusicUrl: new URL(
    //     "https://music.apple.com/de/album/dona-nobis-pacem-2/1465335189?i=1465335191&l=en-GB",
    //   ),
    // };

    // get list of media from local storage (stored as an array of ShazamMedia objects)
    const library = await LocalStorage.getItem<string>("shazam-library").then((value) => {
      return value == undefined ? ([] as ShazamMediaList) : (JSON.parse(value!) as ShazamMediaList);
    });

    // set time of scanning
    media.scannedAt = Date.now();

    // add media to the local storage
    library.push(media);
    await LocalStorage.setItem("shazam-library", JSON.stringify(library));

    return media;
  });

  return isLoading ? (
    <Detail isLoading={true} markdown={`![Shazam](${"../assets/loading.png"})`} />
  ) : // if media is null show error
  error ? (
    <Detail isLoading={false} markdown={"## " + error.name + "\n\n" + error.message + "\n\n" + error.stack} />
  ) : (
    <Detail
      markdown={`![Artwork](${data?.artwork})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={data?.title} />
          <Detail.Metadata.Label title="Subtitle" text={data?.subtitle} />
          <Detail.Metadata.Label title="Artist" text={data?.artist} />
          <Detail.Metadata.TagList title="Genres">
            {data?.genres.map((genre, index) => (
              <Detail.Metadata.TagList.Item key={index} text={genre} color={"#fffff"} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Creation Date"
            text={data?.creationDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel title={data?.title + " by " + data?.artist}>
          <Action title="Open in Apple Music" onAction={() => open(data!.appleMusicUrl.toString())} />
        </ActionPanel>
      }
    />
  );
}
