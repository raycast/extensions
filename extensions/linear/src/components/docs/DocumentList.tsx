import { Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";

import { ProjectResult } from "../../api/getProjects";
import { getInitiativeIcon } from "../../helpers/initiatives";
import { getProjectIcon } from "../../helpers/projects";
import { useDocuments } from "../../hooks/useDocuments";
import { useInitiatives } from "../../hooks/useInitiatives";
import useProjects from "../../hooks/useProjects";
import { useWorkspaceCachedState } from "../../hooks/useWorkspaceCachedState";
import { DocumentEntity } from "../../tools/get-documents";
import { useWorkspaces } from "../WorkspaceContext";
import { isWorkspaceDropdownValue, workspaceValueToKey, WorkspaceDropdownSection } from "../WorkspaceDropdown";

import { Document } from "./Document";

type DocumentListProps = {
  project?: Pick<ProjectResult, "id" | "name">;
};

export function DocumentList({ project }: DocumentListProps) {
  const [query, setQuery] = useState<string>("");
  const { showSwitcher, switchWorkspace } = useWorkspaces();
  const [storedEntity, setStoredEntity] = useWorkspaceCachedState<string>("document-list-entity", "");

  const { projects, isLoadingProjects } = useProjects();
  const { initiatives, isLoadingInitiatives } = useInitiatives();

  // Restore validation: the stored value is used only if its id still exists in the
  // loaded initiatives/projects — otherwise "" (All Documents). A pushed "Project
  // Documents" view (`project` set) never reads persisted state — it stays pinned to
  // its launch project, the dropdown isn't even rendered for it.
  const validatedEntityValue = useMemo(() => {
    if (project) return "";
    if (storedEntity.startsWith("initiative:")) {
      const id = storedEntity.replace("initiative:", "");
      return (initiatives ?? []).some((initiative) => initiative.id === id) ? storedEntity : "";
    }
    if (storedEntity.startsWith("project:")) {
      const id = storedEntity.replace("project:", "");
      return (projects ?? []).some((p) => p.id === id) ? storedEntity : "";
    }
    return "";
  }, [project, storedEntity, initiatives, projects]);

  const entity: DocumentEntity = validatedEntityValue.startsWith("initiative:")
    ? { initiativeId: validatedEntityValue.replace("initiative:", "") }
    : { projectId: validatedEntityValue.replace("project:", "") };

  const { docs, isLoadingDocs, supportsDocTypeahead, mutateDocs } = useDocuments(query, entity);

  const filteredDocs = useMemo(() => {
    if (!docs) {
      return [];
    }

    const docList = docs ?? [];
    if ("initiativeId" in entity && entity.initiativeId.length > 0 && (initiatives ?? []).length > 0) {
      return docList.filter((doc) => doc.initiative && doc.initiative.id === entity.initiativeId);
    }

    if ((projects ?? []).length > 0) {
      if (project) {
        return docList.filter((doc) => doc.project && doc.project.id === project.id);
      }

      if ("projectId" in entity && entity.projectId.length > 0) {
        return docList.filter((doc) => doc.project && doc.project.id === entity.projectId);
      }
    }

    return docList;
  }, [project, entity, docs, projects, initiatives]);

  return (
    <List
      isLoading={isLoadingProjects || isLoadingDocs || isLoadingInitiatives}
      navigationTitle={project ? `${project.name} Documents` : undefined}
      {...(!project && ((projects ?? []).length > 0 || (initiatives ?? []).length > 0 || showSwitcher)
        ? {
            searchBarAccessory: (
              <List.Dropdown
                tooltip="Change Entity"
                value={validatedEntityValue}
                onChange={(newValue) => {
                  if (isWorkspaceDropdownValue(newValue)) {
                    switchWorkspace(workspaceValueToKey(newValue));
                    return;
                  }
                  if (newValue !== validatedEntityValue) setStoredEntity(newValue);
                }}
              >
                <WorkspaceDropdownSection />
                <List.Dropdown.Item value="" title="All Documents" />

                {(initiatives ?? []).length > 0 && (
                  <List.Dropdown.Section title="Initiatives">
                    {initiatives?.map((initiative) => (
                      <List.Dropdown.Item
                        key={initiative.id}
                        value={`initiative:${initiative.id}`}
                        title={initiative.name}
                        icon={getInitiativeIcon(initiative)}
                        keywords={[initiative.name, initiative.description ?? ""]}
                      />
                    ))}
                  </List.Dropdown.Section>
                )}

                {(projects ?? []).length > 0 && (
                  <List.Dropdown.Section title="Projects">
                    {projects?.map((project) => (
                      <List.Dropdown.Item
                        key={project.id}
                        value={`project:${project.id}`}
                        title={project.name}
                        icon={getProjectIcon(project)}
                        keywords={[project.name, project.description]}
                      />
                    ))}
                  </List.Dropdown.Section>
                )}
              </List.Dropdown>
            ),
          }
        : {})}
      {...(!supportsDocTypeahead
        ? { searchBarPlaceholder: "Filter by title, creator, project or initiative name" }
        : { onSearchTextChange: setQuery, searchBarPlaceholder: "Search by document title", throttle: true })}
    >
      {filteredDocs.map((doc) => (
        <Document key={doc.id} {...{ doc, mutateDocs, projects, initiatives }} />
      ))}
      <List.EmptyView title="No documents found" icon={{ source: Icon.DeleteDocument, tintColor: Color.Orange }} />
    </List>
  );
}
