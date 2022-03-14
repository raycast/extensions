import { useState } from "react";
import { MRList, MRScope } from "./components/mr";
import { MyProjectsDropdown } from "./components/project";
import { Project } from "./gitlabapi";

export default function MyMergeRequests(): JSX.Element {
  const [project, setProject] = useState<Project>();
  return (
    <MRList
      scope={MRScope.assigned_to_me}
      project={project}
      searchBarAccessory={<MyProjectsDropdown onChange={setProject} />}
    />
  );
}
