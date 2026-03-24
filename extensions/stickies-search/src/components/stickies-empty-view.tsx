import { List } from "@raycast/api";
import { StickiesNote } from "../utils/stickies-utils";
import { MutatePromise } from "@raycast/utils";
import React from "react";
import { StickiesListEmptyView } from "./stickies-list-empty-view";

export function StickiesEmptyView(props: {
  mutate: MutatePromise<StickiesNote[] | undefined, StickiesNote[] | undefined>;
  isLoading?: boolean;
  error?: Error | unknown | null;
}) {
  const { mutate, isLoading, error } = props;
  return (
    <List isLoading={Boolean(isLoading)}>
      <StickiesListEmptyView mutate={mutate} isLoading={isLoading} error={error} />
    </List>
  );
}
