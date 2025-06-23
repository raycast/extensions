import { ActionPanel, Action, Icon, List, getPreferenceValues, showToast, Color } from "@raycast/api";
import { Akiflow, openInAkiflow, openAkiflow } from "../utils/akiflow";
import { useState, useEffect } from "react";
import { useCachedState } from "@raycast/utils";

interface Project {
  title: string;
  color: string;
  parentId: string | null;
  icon: string;
}

function transformAndSortProjects(
  projects: Record<string, Project>,
): Array<{ key: string; title: string; color: string; parentId: string | null; icon: string }> {
  // Convert the projects object into an array of entries
  const entries = Object.entries(projects).map(([key, project]) => ({
    key,
    title: project.title,
    color: project.color,
    parentId: project.parentId,
    icon: project.icon,
  }));

  // Create a map to hold children for each parent
  const parentMap: Record<
    string,
    Array<{ key: string; title: string; color: string; parentId: string | null; icon: string }>
  > = {};
  const parents: Array<{ key: string; title: string; color: string; parentId: string | null; icon: string }> = [];

  // Populate the parentMap and collect parents
  for (const entry of entries) {
    if (entry.parentId === null) {
      // It's a parent project
      parents.push(entry);
    } else {
      // It's a child project
      if (!parentMap[entry.parentId]) {
        parentMap[entry.parentId] = [];
      }
      parentMap[entry.parentId].push(entry);
    }
  }

  // Sort parents lexicographically by title
  parents.sort((a, b) => a.title.localeCompare(b.title));

  // Construct the final sorted list
  const sortedProjects: Array<{ key: string; title: string; color: string; parentId: string | null; icon: string }> =
    [];

  // Add parents and their children to the sorted list
  for (const parent of parents) {
    sortedProjects.push(parent); // Add the parent project
    if (parentMap[parent.key]) {
      // Sort children of this parent lexicographically by title
      const children = parentMap[parent.key].sort((a, b) => a.title.localeCompare(b.title));
      sortedProjects.push(...children); // Add children to the sorted list
    }
  }

  return sortedProjects;
}

export default function Command() {
  const [projects, setProjects] = useCachedState<{ [key: string]: Project }>("projects", {});
  const [tags, setTags] = useCachedState<{ [key: string]: string }>("tags", {});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshToken = getPreferenceValues<Preferences>().refreshToken;

  useEffect(() => {
    const akiflow = new Akiflow(refreshToken);

    const fetchProjectsAndTags = async () => {
      try {
        await akiflow.projectsPromise; // Wait for the projects to be fetched
        setProjects(akiflow.projects); // Set the projects state
        await akiflow.refreshTags(); // Fetch tags
        setTags(akiflow.tags); // Set the tags state
      } catch (error) {
        console.error("Error fetching projects or tags", error);
        showToast({ title: "Error", message: "Failed to fetch projects or tags" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectsAndTags();
  }, [refreshToken]);
  const sortedProjects = transformAndSortProjects(projects);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects">
      <List.Section title="Projects">
        {sortedProjects.length > 0 ? (
          sortedProjects.map((project) => (
            <List.Item
              key={project.key}
              title={project.title}
              // subtitle={project.color ? project.color : "no color provided"}
              icon={project.parentId ? (project.icon ?? Icon.Hashtag) : Icon.Folder}
              keywords={[...(project.parentId ? ["project", "#"] : ["folder"])]}
              actions={
                project.parentId ? (
                  <ActionPanel title="Project Actions">
                    <Action
                      title={`Open ${project.icon} ${project.title} in Akiflow`}
                      icon={"akiflow-menu-bar-icon.png"}
                      onAction={() => {
                        openInAkiflow(project.title);
                      }}
                    />
                    <Action.OpenInBrowser
                      title={`Open ${project.icon} ${project.title} in Akiflow Web`}
                      url={`https://web.akiflow.com/#/planner/list/${project.key}`}
                    />
                  </ActionPanel>
                ) : (
                  <ActionPanel title="Folder Actions">
                    <Action
                      title="Open Akiflow"
                      onAction={() => {
                        openAkiflow();
                      }}
                    ></Action>
                  </ActionPanel>
                )
              }
            />
          ))
        ) : (
          <List.Item title="No projects found" icon={{ source: Icon.QuestionMark, tintColor: Color.Red }} />
        )}
      </List.Section>
      <List.Section title="Tags">
        {Object.entries(tags).length > 0 ? (
          Object.entries(tags).map(([name, id]) => (
            <List.Item
              key={id}
              title={name}
              icon={Icon.Tag}
              keywords={["tag", "*"]}
              actions={
                <ActionPanel title="Tag Actions">
                  <Action
                    title={`Open 🏷️ ${name} in Akiflow Web`}
                    onAction={() => {
                      openInAkiflow(name);
                    }}
                  />
                  <Action.OpenInBrowser
                    title={`Open 🏷️ ${name} in Akiflow Web`}
                    url={`https://web.akiflow.com/#/planner/tags/${id}`}
                  />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.Item title="No tags found" icon={{ source: Icon.QuestionMark, tintColor: Color.Red }} />
        )}
      </List.Section>
    </List>
  );
}
