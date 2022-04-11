import { List } from "@raycast/api";

import { GifResult } from "./GifResult";
import type { IGif } from "../models/gif";

export function GifListSection(props: { title?: string, term?: string, hide?:boolean, results?: IGif[] }) {
  let {title} = props;
  if (!title) {
    title = props.term ? `GIF results for "${props.term}"` : "Trending";
  }

  return !props.hide ? (
    <List.Section title={title}>
      {props.results?.map((result, index) => (
        <GifResult key={result.id} item={result} index={index} />
      ))}
    </List.Section>
  ) : null;
}
