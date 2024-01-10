import { Detail, List } from "@raycast/api";
import { SelectProjectsForm } from "./projects/SelectProjectsForm";
import { ErrorView } from "./ErrorView";
import { useMyProjects } from "./hooks/useMyProjects";
import { useLoadingToast } from "./hooks/useLoadingToast";
import { myProjects as myProjectsFromApi } from "./gitlab/project";
import { myProjects as myProjectsFromStorage } from "./storage";

export default function Command() {
  const storage = useMyProjects(myProjectsFromStorage);
  const api = useMyProjects(myProjectsFromApi);

  useLoadingToast("Fetching your projects", storage.isLoading || api.isLoading);

  return storage.isLoading || api.isLoading ? (
    <EmptyView />
  ) : api.error ? (
    <List>
      <ErrorView error={api.error} />
    </List>
  ) : (
    <SelectProjectsForm allProjects={api.data!} selectedProjects={storage.data!} />
  );
}

function EmptyView() {
  return <Detail />;
}
