import { List } from "@raycast/api";
import { Project } from "../../utils";
import { __ } from "../../i18n";
import { ProjectEmptyState } from "../ProjectEmptyState";
import { ProjectListItem } from "../ProjectListItem";

interface ProjectsListProps {
  projects: Project[];
  isLoading: boolean;
  onStartAnalyze: (path: string, name: string) => void;
}

/**
 * Component for rendering the projects list
 * Handles both empty state and populated list scenarios
 */
export function ProjectsList({ projects, isLoading, onStartAnalyze }: ProjectsListProps) {
  return (
    <List
      isLoading={isLoading}
      navigationTitle={__("commands.allInOne.title")}
      searchBarPlaceholder={__("commands.runSonarAnalysis.searchPlaceholder")}
    >
      {projects.length === 0 && !isLoading ? (
        <ProjectEmptyState />
      ) : (
        projects.map((project) => (
          <ProjectListItem key={project.id} project={project} onStartAnalyze={onStartAnalyze} />
        ))
      )}
    </List>
  );
}
