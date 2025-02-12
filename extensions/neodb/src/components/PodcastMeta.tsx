import { Podcast } from "../types";
import { Detail } from "@raycast/api";
import { renderGenre } from "../ItemDetail";

interface PodcastDetailProps {
  data: Podcast;
  rating: number;
}

const PodcastMeta: React.FC<PodcastDetailProps> = ({ data, rating }) => {
  const { genre, hosts, official_site } = data as Podcast;

  return (
    <Detail.Metadata>
      {rating && <Detail.Metadata.Label title="Rating" text={rating.toString()} />}
      {renderGenre(genre)}
      {hosts.length !== 0 && <Detail.Metadata.Label title="Hosts" text={hosts.join(", ")} />}
      {official_site && <Detail.Metadata.Link title="Official Website" target={official_site} text={official_site} />}
    </Detail.Metadata>
  );
};
export default PodcastMeta;
