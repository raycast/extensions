import { List } from "@raycast/api";
import AuthorizedView from "./components/AuthorizedView";
import { useProjects } from "./hooks/useProjects";
import ProjectItemListItem from "./components/ProjectItemListItem";
import ErrorEmptyView from "./components/ErrorEmptyView";

function SearchProjects() {
  const { isLoading, projects, pagination, error, revalidate } = useProjects({ showsErrorInline: true });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects" pagination={pagination}>
      {error && projects.length === 0 ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView title="No projects found" />
      )}
      {projects.map((projectItem) => (
        <ProjectItemListItem key={projectItem.id + projectItem.name} projectItem={projectItem} />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <AuthorizedView>
      <SearchProjects />
    </AuthorizedView>
  );
}
