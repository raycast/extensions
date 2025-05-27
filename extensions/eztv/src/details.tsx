import { Detail } from "@raycast/api";
import Actions from "./actions";
import { Series } from "./types";
import { formatSeasonAndEpisodeNumber, getDisplaySize } from "./util";

type Props = {
  data: Series;
};

export default function DetailsView({ data }: Props) {
  const hasImdbId = data.imdb_id !== "0";

  const markdown = `
  # File Name
  ${data.filename}
  # File Size
  ${getDisplaySize(data.size_bytes)}
  # Episode
  ${hasImdbId ? `S${formatSeasonAndEpisodeNumber(data.season)}E${formatSeasonAndEpisodeNumber(data.episode)}` : "N/A"}
  # Date Released
  ${new Date(data.date_released_unix * 1000).toLocaleString()}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={data.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Seeds" text={data.seeds.toString()} />
          <Detail.Metadata.Label title="Peers" text={data.peers.toString()} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Link title="Magnet" target={data.magnet_url} text="Download" />
          <Detail.Metadata.Link title="Torrent" target={data.torrent_url} text="Download" />

          {hasImdbId && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link
                title="Link"
                target={`https://www.imdb.com/title/tt${data.imdb_id}`}
                text="Open IMDb Page"
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={<Actions data={data} />}
    />
  );
}
