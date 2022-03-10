import { List } from "@raycast/api";
import { useState } from "react";
import { IssueListItem } from "./IssueListItem";
import { useIssues } from "./hooks";
import { Project } from "./types";
import { ProjectDropdown } from "./ProjectDropdown";
import { SWRConfig } from "swr";
import { cacheProvider } from "./cache";
import { isFakeData } from "./fake";

function IssueList() {
  const [project, setProject] = useState<Project>();
  const { data: issues, isValidating } = useIssues(project);

  return (
    <List
      isLoading={project === undefined || isValidating}
      searchBarPlaceholder="Filter issues by title"
      searchBarAccessory={<ProjectDropdown onProjectChange={setProject} />}
    >
      {issues?.map((issue) => (
        <IssueListItem key={issue.id} issue={issue} />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <SWRConfig value={{ provider: isFakeData ? undefined : cacheProvider }}>
      <IssueList />
    </SWRConfig>
  );
}
