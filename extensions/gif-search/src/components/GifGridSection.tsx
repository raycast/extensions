import { GifGridItem } from "./GifGridItem";
import type { IGif } from "../models/gif";
import { ServiceName } from "../preferences";
import { Grid } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";

export interface GifGridSectionProps {
  title: string;
  term?: string;
  results?: IGif[];
  service?: ServiceName;
  isLocalGifSection?: boolean;
  favoriteGifs?: IGif[];
  mutate: () => Promise<void>;
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

  return (
    <Grid.Section title={title} key={props.title}>
      {gifs?.map((result, index) => (
        <GifGridItem
          key={result.id}
          item={result}
          index={index}
          visitGifItem={visitGifItem}
          service={props.service}
          section={props.title}
          mutate={props.mutate}
        />
      ))}
    </Grid.Section>
  );
}
