import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { EntryBrowser } from "./entry-browser";
import { fetchProjects } from "./feed";

export default function Command() {
  const {
    data: projects = [],
    isLoading,
    revalidate,
  } = useCachedPromise(fetchProjects, [], {
    onError: (error) => {
      showFailureToast(error, { title: "Could not load projects" });
    },
  });

  return <EntryBrowser kind="project" entries={projects} isLoading={isLoading} onRefresh={revalidate} />;
}
