import { Game } from "../types";
import { Detail } from "@raycast/api";
import { renderGenre } from "../ItemDetail";

interface GameMetaProps {
  data: Game;
  rating: number;
}

const GameMeta: React.FC<GameMetaProps> = ({ data, rating }) => {
  const { genre, developer, publisher, platform, release_date, official_site } = data as Game;

  return (
    <Detail.Metadata>
      {rating && <Detail.Metadata.Label title="Rating" text={rating.toString()} />}
      {renderGenre(genre)}
      {developer.length !== 0 && <Detail.Metadata.Label title="Developer" text={developer.join(", ")} />}
      {publisher.length !== 0 && <Detail.Metadata.Label title="Publisher" text={publisher.join(", ")} />}
      {platform.length !== 0 && <Detail.Metadata.Label title="Platform" text={platform.join(", ")} />}
      {release_date && <Detail.Metadata.Label title="Release Date" text={release_date.toString()} />}
      {official_site && <Detail.Metadata.Link title="Official Website" target={official_site} text={official_site} />}
    </Detail.Metadata>
  );
};
export default GameMeta;
