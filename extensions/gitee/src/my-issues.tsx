import { Color, Icon, List } from "@raycast/api";
import React, { useState } from "react";
import { myIssues } from "./hooks/hooks";
import { GiteeEmptyView } from "./components/GiteeEmptyView";
import { IssueItem } from "./components/IssueItem";
import { issueFilter } from "./utils/constants";

export default function MyRepositories() {
  const [filter, setFilter] = useState(issueFilter[0].value + "");
  const { openIssues, progressingIssues, loading } = myIssues(filter);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search issues"}
      searchBarAccessory={
        <List.Dropdown tooltip="Issues Filter" storeValue={true} onChange={setFilter}>
          {issueFilter.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.label} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      <GiteeEmptyView title={"No Issues"} />
      <List.Section title={"Open"} subtitle={openIssues?.length + " issue" + (openIssues?.length > 1 ? "s" : "")}>
        {openIssues?.map((issue) => {
          return <IssueItem key={issue.id} issue={issue} icon={Icon.Circle} iconColor={Color.Green} />;
        })}
      </List.Section>
      <List.Section
        title={"Progressing"}
        subtitle={progressingIssues?.length + " issue" + (progressingIssues?.length > 1 ? "s" : "")}
      >
        {progressingIssues?.map((issue) => {
          return <IssueItem key={issue.id} issue={issue} icon={Icon.TwoArrowsClockwise} iconColor={Color.Yellow} />;
        })}
      </List.Section>
    </List>
  );
}
