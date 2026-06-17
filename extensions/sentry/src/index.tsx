import { List } from "@raycast/api";
import { useState } from "react";
import { IssueListItem } from "./IssueListItem";
import { useIssues } from "./sentry";
import { Project } from "./types";
import { ProjectDropdown } from "./ProjectDropdown";
import { UnauthorizedError } from "./UnauthorizedError";

export default function Command() {
  const [project, setProject] = useState<Project>();
  const [projectError, setProjectError] = useState<Error>();
  const { data, error, isLoading, mutate, pagination } = useIssues(project);

  if (projectError || (error && error instanceof Error && error.message.includes("Unauthorized"))) {
    return <UnauthorizedError />;
  }

  return (
    <List
      isLoading={project === null || isLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter issues by title or assignee"
      searchBarAccessory={<ProjectDropdown onProjectChange={setProject} onError={setProjectError} />}
    >
      {data?.map((issue) => (
        <IssueListItem key={issue.id} issue={issue} organization={project?.organization} mutateList={mutate} />
      ))}
    </List>
  );
}
