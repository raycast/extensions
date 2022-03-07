import { List } from "@raycast/api";
import { GifResult } from "./GifResult";

import type { IGif } from "../models/gif";

export function GifList(props: { term?: string; results?: IGif[] }) {
  if (props.term) {
    return (
      <List.Section title={`GIF results for "${props.term}"`}>
        {props.results?.map((result, index) => (
          <GifResult key={result.id} item={result} index={index} />
        ))}
      </List.Section>
    );
  }

  return (
    <List.Section title="Trending">
      {props.results?.map((result, index) => (
        <GifResult key={result.id} item={result} index={index} />
      ))}
    </List.Section>
  );
}
