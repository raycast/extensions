import { List } from "@raycast/api";
import AuthorizedView from "./components/AuthorizedView";
import { useProjects } from "./hooks/useProjects";
import ProjectItemListItem from "./components/ProjectItemListItem";

function SearchProjects() {
  const { isLoading, projects, pagination } = useProjects({});

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects" pagination={pagination}>
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
