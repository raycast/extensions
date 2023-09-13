import { GifResult } from "./GifGridItem";
import type { IGif } from "../models/gif";
import { ServiceName } from "../preferences";
import { Grid } from "@raycast/api";

export interface GifGridSectionProps {
  title?: string;
  term?: string;
  hide?: boolean;
  results?: IGif[];
  service?: ServiceName;
}

export function GifGridSection(props: GifGridSectionProps) {
  let { title } = props;
  if (props.term) {
    title = `GIF results for "${props.term}"`;
  }

  return !props.hide ? (
    <Grid.Section title={title} key={props.title}>
      {props.results?.map((result, index) => (
        <GifResult key={result.id} item={result} index={index} service={props.service} />
      ))}
    </Grid.Section>
  ) : null;
}
