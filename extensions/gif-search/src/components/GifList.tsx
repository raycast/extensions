import { List } from "@raycast/api";

import { GifResult } from "./GifResult";
import type { IGif } from "../models/gif";

export function GifList(props: { term?: string; results?: IGif[] }) {
  const title = props.term ? `GIF results for "${props.term}"` : "Trending";

  return (
    <List.Section title={title}>
      {props.results?.map((result, index) => (
        <GifResult key={result.id} item={result} index={index} />
      ))}
    </List.Section>
  );
}
