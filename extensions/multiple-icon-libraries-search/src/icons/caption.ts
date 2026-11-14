import { Grid } from "@raycast/api";
import { Section } from "./sections";
import { LibraryId } from "./types";

export interface CaptionInput {
  sections: Section[];
  library: LibraryId;
  compact: boolean;
}

/** No caption: the command's title stays fixed, as Raycast's Store rules ask. */
export function useCaption(view: CaptionInput): Partial<Grid.Props> {
  void view;
  return {};
}
