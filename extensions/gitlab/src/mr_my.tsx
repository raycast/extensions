import { ActionPanel } from "@raycast/api";
import { useState } from "react";
import { MRList, MRScope } from "./components/mr";
import { useMyProjects } from "./components/project";
import { Project } from "./gitlabapi";
import { projectIconUrl } from "./utils";

export default function MyMergeRequests(): JSX.Element {
  const { projects: myprojects } = useMyProjects();
  const [project, setProject] = useState<Project>();
  const handle = (pro: Project | undefined) => {
    setProject(pro);
  };
  const myProjectAction = () => {
    if (myprojects) {
      return (
        <ActionPanel.Submenu title="Select Project" shortcut={{ modifiers: ["cmd"], key: "p" }}>
          <ActionPanel.Section>
            <ActionPanel.Item title="All Projects" onAction={() => handle(undefined)} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {myprojects.map((pro) => (
              <ActionPanel.Item
                key={`${pro.id}`}
                title={pro.name_with_namespace}
                icon={projectIconUrl(pro)}
                onAction={() => handle(pro)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel.Submenu>
      );
    }
    return undefined;
  };
  return <MRList scope={MRScope.assigned_to_me} selectProjectAction={myProjectAction()} project={project} />;
}
