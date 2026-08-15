import { useMemo } from "react";
import { useRepositoriesList } from "./hooks/useRepositoriesList";
import OpenRepository from "./open-repository";
import ManageRepositories from "./manage-repositories";

/**
 * Command to open the last visited Git repository.
 */
export default function OpenLastVisitedRepository() {
  const { repositories: allRepositories } = useRepositoriesList();

  // Filter out cloning repositories and get the last visited one
  const lastVisitedRepository = useMemo(() => {
    const currentRepositories = allRepositories.filter((repo) => !repo.cloning);

    if (currentRepositories.length === 0) {
      return null;
    }

    // Sort by lastOpenedAt descending and get the first one
    return currentRepositories.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)[0];
  }, []); // compute only once on amount of repositories change

  if (!lastVisitedRepository) {
    return <ManageRepositories />;
  }

  return <OpenRepository arguments={{ path: lastVisitedRepository.path }} />;
}
