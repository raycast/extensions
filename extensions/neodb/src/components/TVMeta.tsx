import { TV } from "../types";
import { Detail } from "@raycast/api";
import { renderGenre } from "../ItemDetail";

interface TVDetailProps {
  data: TV;
  rating: number;
}

const TVDetail: React.FC<TVDetailProps> = ({ data, rating }) => {
  const {
    orig_title,
    other_title,
    director,
    playwright,
    actor,
    area,
    year,
    genre,
    language,
    site,
    season_number,
    episode_count,
  } = data as TV;

  return (
    <Detail.Metadata>
      {orig_title && <Detail.Metadata.Label title="Original Title" text={orig_title} />}
      {other_title.length !== 0 && <Detail.Metadata.Label title="Alternative Title" text={other_title.join(",")} />}
      {renderGenre(genre)}
      {rating && <Detail.Metadata.Label title="Rating" text={rating.toString()} />}
      <Detail.Metadata.Separator />
      {director.length !== 0 && <Detail.Metadata.Label title="Director" text={director.join(", ")} />}
      {playwright.length !== 0 && <Detail.Metadata.Label title="Playwright" text={playwright.join(" ")} />}
      {actor.length !== 0 && <Detail.Metadata.Label title="Actor" text={actor.join(", ")} />}
      {area.length !== 0 && <Detail.Metadata.Label title="Area" text={area.join(", ")} />}
      <Detail.Metadata.Separator />
      {language.length !== 0 && <Detail.Metadata.Label title="Language" text={language.join(", ")} />}
      {year && <Detail.Metadata.Label title="Year" text={year.toString()} />}
      {episode_count && <Detail.Metadata.Label title="Episode Count" text={episode_count.toString()} />}
      {season_number && <Detail.Metadata.Label title="Season" text={season_number.toString()} />}
      {site && <Detail.Metadata.Link title="Official Website" target={site} text={site} />}
    </Detail.Metadata>
  );
};
export default TVDetail;
