import { ActionPanel, List } from "@raycast/api";
import React from "react";
import { ActionToAdvancedSearchOptions } from "./action-to-advanced-search-options";
import { MAVEN_CENTRAL_REPOSITORY_SEARCH } from "../utils/constants";
import { ActionToPexels } from "./action-to-pexels";

export function MavenEmptyView(props: { title: string }) {
  const { title } = props;
  return (
    <List.EmptyView
      title={title}
      icon={"empty-view-icon.svg"}
      actions={
        <ActionPanel>
          <ActionToAdvancedSearchOptions />
          <ActionToPexels url={MAVEN_CENTRAL_REPOSITORY_SEARCH} />
        </ActionPanel>
      }
    />
  );
}
