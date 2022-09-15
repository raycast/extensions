import { useCachedPromise } from "@raycast/utils";
import { fetchReleases } from "./github";
import { Repository } from "./types";

export function useRepositoryReleases(repository: Repository) {
  const [owner, name] = repository.nameWithOwner.split("/");
  return useCachedPromise(fetchReleases, [owner, name]);
}
