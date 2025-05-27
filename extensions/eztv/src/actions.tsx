import { Action, ActionPanel } from "@raycast/api";
import DetailsView from "./details";
import { Series } from "./types";

type Props = {
  data: Series;
  showDetails?: boolean;
};

export default function Actions({ data, showDetails }: Props) {
  return (
    <ActionPanel>
      {showDetails && <Action.Push title="Show Details" target={<DetailsView data={data} />} />}
      <ActionPanel.Section title="Download">
        <Action.OpenInBrowser title="Open Magnet URL" url={data.magnet_url} />
        <Action.CopyToClipboard title="Copy Magnet URL" content={data.magnet_url} />
        <Action.OpenInBrowser title="Download Torrent" url={data.torrent_url} />
      </ActionPanel.Section>
      {data.imdb_id !== "0" && (
        <Action.OpenInBrowser title="Open IMDb Page" url={`https://www.imdb.com/title/tt${data.imdb_id}`} />
      )}
      {/* {data.imdb_id !== "0" && <Action.Push title="List All Episodes" target={<DetailsView data={data} />} />} */}
    </ActionPanel>
  );
}
