import { List } from "@raycast/api";
import { StickiesNote } from "../utils/stickies-utils";
import { MutatePromise } from "@raycast/utils";
import React from "react";
import { StickiesListEmptyView } from "./stickies-list-empty-view";

export function StickiesEmptyView(props: {
  mutate: MutatePromise<StickiesNote[] | undefined, StickiesNote[] | undefined>;
}) {
  const { mutate } = props;
  return (
    <List>
      <StickiesListEmptyView mutate={mutate} />
    </List>
  );
}
