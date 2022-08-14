import { List } from "@raycast/api";
import { useState } from "react";
import { IssueListItem } from "./IssueListItem";
import { useIssues } from "./sentry";
import { Project } from "./types";
import { ProjectDropdown } from "./ProjectDropdown";

export default function Command() {
  const [project, setProject] = useState<Project>();
  const { data, isLoading, mutate } = useIssues(project);

  return (
    <List
      isLoading={project === undefined || isLoading}
      searchBarPlaceholder="Filter issues by title or assignee"
      searchBarAccessory={<ProjectDropdown onProjectChange={setProject} />}
    >
      {data?.map((issue) => (
        <IssueListItem key={issue.id} issue={issue} organization={project?.organization} mutateList={mutate} />
      ))}
    </List>
  );
}
