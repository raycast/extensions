import { Application, List } from "@raycast/api";
import type { Repository } from "../lib/ghq";
import { RepositoryItem } from "./RepositoryItem";

/** Lists the repositories `ghq get` produced, with the same actions as the List Repositories command. */
export function RepositoryResultList({
  repositories,
  openers,
}: {
  repositories: Repository[];
  openers: Application[];
}) {
  return (
    <List searchBarPlaceholder="Search repositories…">
      {repositories.map((repository) => (
        <RepositoryItem key={repository.path} repository={repository} openers={openers} />
      ))}
    </List>
  );
}
