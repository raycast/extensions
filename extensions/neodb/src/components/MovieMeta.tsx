import { Movie } from "../types";
import { Detail } from "@raycast/api";
import { renderGenre } from "../ItemDetail";
interface MovieMetaProps {
  data: Movie;
  rating: number;
}

const MovieMeta: React.FC<MovieMetaProps> = ({ data, rating }) => {
  const { orig_title, other_title, director, playwright, actor, area, year, imdb, genre, language, site, duration } =
    data as Movie;

  return (
    <Detail.Metadata>
      {orig_title && <Detail.Metadata.Label title="Original Title" text={orig_title} />}
      {other_title.length !== 0 && <Detail.Metadata.Label title="Alternative Title" text={other_title.join(",")} />}
      {renderGenre(genre)}
      {rating && <Detail.Metadata.Label title="Rating" text={rating.toString()} />}
      {director.length !== 0 && <Detail.Metadata.Label title="Director" text={director.join(", ")} />}
      {playwright.length !== 0 && <Detail.Metadata.Label title="Playwright" text={playwright.join(" ")} />}
      {actor.length !== 0 && <Detail.Metadata.Label title="Actor" text={actor.join(", ")} />}
      {area.length !== 0 && <Detail.Metadata.Label title="Area" text={area.join(", ")} />}
      {language.length !== 0 && <Detail.Metadata.Label title="Language" text={language.join(", ")} />}
      {year && <Detail.Metadata.Label title="Year" text={year.toString()} />}
      {site && <Detail.Metadata.Link title="Official Website" target={site} text={site} />}
      {duration && <Detail.Metadata.Label title="Duration" text={duration} />}
      {imdb && <Detail.Metadata.Label title="IMDB" text={imdb} />}
    </Detail.Metadata>
  );
};
export default MovieMeta;
