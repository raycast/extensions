import { useMemo, useState } from "react";
import { Color, Icon, List } from "@raycast/api";
import useProjects from "../../hooks/useProjects";
import { useDocuments } from "../../hooks/useDocuments";
import { getProjectIcon } from "../../helpers/projects";
import { Document } from "./Document";
import { ProjectResult } from "../../api/getProjects";
import { useInitiatives } from "../../hooks/useInitiatives";

type DocumentListProps = {
  project?: Pick<ProjectResult, "id" | "name">;
};

export function DocumentList({ project }: DocumentListProps) {
  const [query, setQuery] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");

  const { projects, isLoadingProjects } = useProjects();
  const { initiatives, isLoadingInitiatives } = useInitiatives();
  const { docs, isLoadingDocs, supportsDocTypeahead, mutateDocs } = useDocuments(query, projectId);

  const filteredDocs = useMemo(() => {
    if (!docs) {
      return [];
    }

    const id = project ? project.id : projectId;
    if (!id.trim().length || !projects || projects.length < 1) {
      return docs;
    }

    return docs?.filter((doc) => (doc.project?.id ?? "") === id) || [];
  }, [project, projectId, docs, projects]);

  return (
    <List
      isLoading={isLoadingProjects || isLoadingDocs || isLoadingInitiatives}
      navigationTitle={project ? `${project.name} Documents` : undefined}
      {...(!project && (projects ?? []).length > 0
        ? {
            searchBarAccessory: (
              <List.Dropdown
                tooltip="Change Parent"
                onChange={setProjectId}
                storeValue
                filtering={{ keepSectionOrder: true }}
              >
                <List.Dropdown.Item value="" title="All Documents" />

                <List.Dropdown.Section title="Projects">
                  {projects?.map((project) => (
                    <List.Dropdown.Item
                      key={project.id}
                      value={project.id}
                      title={project.name}
                      keywords={[project.name, project.description]}
                      icon={getProjectIcon(project)}
                    />
                  ))}
                </List.Dropdown.Section>
              </List.Dropdown>
            ),
          }
        : {})}
      {...(!supportsDocTypeahead
        ? { filtering: { keepSectionOrder: true }, searchBarPlaceholder: "Filter by title, creator or project" }
        : { onSearchTextChange: setQuery, searchBarPlaceholder: "Search by document title", throttle: true })}
    >
      {filteredDocs.map((doc) => (
        <Document key={doc.id} {...{ doc, mutateDocs, projects, initiatives }} />
      ))}
      <List.EmptyView title="No documents found" icon={{ source: Icon.Document, tintColor: Color.Orange }} />
    </List>
  );
}
