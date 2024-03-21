import { GifGridItem } from "./GifGridItem";
import type { IGif } from "../models/gif";
import { ServiceName } from "../preferences";
import { Grid } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";

export interface GifGridSectionProps {
  title: string;
  term?: string;
  hide?: boolean;
  results?: IGif[];
  service?: ServiceName;
  isLocalGifSection?: boolean;
}

export function GifGridSection(props: GifGridSectionProps) {
  const results = [...(props.results ?? [])];
  const { data: sortedGifs, visitItem: visitGifItem } = useFrecencySorting(results, {
    namespace: props.service,
  });

  let { title } = props;
  if (props.term) {
    title = `GIF results for "${props.term}"`;
  }

  const gifs = props.isLocalGifSection ? sortedGifs : props.results;

  return !props.hide ? (
    <Grid.Section title={title} key={props.title}>
      {gifs?.map((result, index) => (
        <GifGridItem
          key={result.id}
          item={result}
          index={index}
          service={props.service}
          visitGifItem={visitGifItem}
          section={props.title}
        />
      ))}
    </Grid.Section>
  ) : null;
}
