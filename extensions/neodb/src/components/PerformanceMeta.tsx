import { Performance } from "../types";
import { Detail } from "@raycast/api";
import { renderGenre } from "../ItemDetail";

interface PerformanceMetaProps {
  data: Performance;
  rating: number;
}

const PerformanceMeta: React.FC<PerformanceMetaProps> = ({ data, rating }) => {
  const {
    official_site,
    orig_creator,
    other_title,
    genre,
    language,
    opening_date,
    closing_date,
    director,
    playwright,
    composer,
    choreographer,
    performer,
    actor,
    crew,
    orig_title,
  } = data as Performance;

  return (
    <Detail.Metadata>
      {orig_title && <Detail.Metadata.Label title="Original Title" text={orig_title} />}
      {other_title.length !== 0 && <Detail.Metadata.Label title="Alternative Title" text={other_title.join(",")} />}
      {renderGenre(genre)}
      {rating && <Detail.Metadata.Label title="Rating" text={rating.toString()} />}
      <Detail.Metadata.Separator />
      {director.length !== 0 && <Detail.Metadata.Label title="Director" text={director.join(", ")} />}
      {actor.length !== 0 && <Detail.Metadata.Label title="Actor" text={actor.map((actor) => actor.name).join(", ")} />}
      {orig_creator.length !== 0 && <Detail.Metadata.Label title="Original Creator" text={orig_creator.join(", ")} />}
      {playwright.length !== 0 && <Detail.Metadata.Label title="Playwright" text={playwright.join(", ")} />}
      {composer.length !== 0 && <Detail.Metadata.Label title="Composer" text={composer.join(", ")} />}
      {crew.length !== 0 && <Detail.Metadata.Label title="Crew" text={crew.join(", ")} />}
      {choreographer.length !== 0 && <Detail.Metadata.Label title="Choreographer" text={choreographer.join(", ")} />}
      {performer.length !== 0 && <Detail.Metadata.Label title="Performer" text={performer.join(", ")} />}
      {opening_date && <Detail.Metadata.Label title="Opening Date" text={opening_date.toString()} />}
      {closing_date && <Detail.Metadata.Label title="Closing Date" text={closing_date.toString()} />}
      <Detail.Metadata.Separator />
      {language.length !== 0 && <Detail.Metadata.Label title="Language" text={language.join(", ")} />}
      {official_site && <Detail.Metadata.Link title="Website" target={official_site} text={official_site} />}
    </Detail.Metadata>
  );
};
export default PerformanceMeta;
