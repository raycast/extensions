import { List } from "@raycast/api";

import { GifResult } from "./GifResult";
import type { IGif } from "../models/gif";

export interface GifListSectionProps {
  title?: string;
  term?: string;
  hide?: boolean;
  results?: IGif[];
}

export function GifListSection(props: GifListSectionProps) {
  let { title } = props;
  if (props.term) {
    title = `GIF results for "${props.term}"`;
  }

  return !props.hide ? (
    <List.Section title={title} key={props.title}>
      {props.results?.map((result, index) => (
        <GifResult key={result.id} item={result} index={index} />
      ))}
    </List.Section>
  ) : null;
}
