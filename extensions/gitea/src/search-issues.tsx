import React from "react";
import { getPreferenceValues } from "@raycast/api";
import { SearchIssues } from "./components/commands/search-issues";

export default function Command() {
  const { defaultIssuesState } = getPreferenceValues();

  return <SearchIssues searchBarPlaceholder="Search for issues" type="issues" defaultState={defaultIssuesState} />;
}
