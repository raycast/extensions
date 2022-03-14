import { useState } from "react";
import { IssueList, IssueScope, IssueState } from "./components/issues";
import { MyProjectsDropdown } from "./components/project";
import { Project } from "./gitlabapi";

export default function MyIssues(): JSX.Element {
  const [project, setProject] = useState<Project>();
  return (
    <IssueList
      scope={IssueScope.assigned_to_me}
      state={IssueState.opened}
      project={project}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
    />
  );
}
