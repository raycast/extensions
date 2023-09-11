import { GifResult } from "./GifResult";
import type { IGif } from "../models/gif";
import { ServiceName } from "../preferences";
import { Grid } from "@raycast/api";

export interface GifListSectionProps {
  title?: string;
  term?: string;
  hide?: boolean;
  results?: IGif[];
  service?: ServiceName;
}

export function GifListSection(props: GifListSectionProps) {
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
