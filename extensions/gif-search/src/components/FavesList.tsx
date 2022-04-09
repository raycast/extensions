import { List } from "@raycast/api";

import { GifResult } from "./GifResult";
import type { IGif } from "../models/gif";

export function FavesList(props: { results?: IGif[]; show: boolean }) {
  return props.show ? (
    <List.Section title="Favorites">
      {props.results?.map((result, index) => (
        <GifResult key={result.id} item={result} index={index} />
      ))}
    </List.Section>
  ) : null;
}
