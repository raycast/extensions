import type { CodeManager } from "../CodeManager";
import type { GitHubManager } from "../GitHubManager";
import { List } from "@raycast/api";
import { OwnersListItem } from "./OwnersListItem";
import { useCachedPromise } from "@raycast/utils";

export function OwnersList({ codeManager, githubManager }: { codeManager: CodeManager; githubManager: GitHubManager }) {
  const { data, isLoading } = useCachedPromise(() => githubManager.listOwners(), [], { keepPreviousData: true });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select repository owner...">
      <List.Section title="Repository owner" subtitle={data?.length + ""}>
        {data?.map((owner) => (
          <OwnersListItem
            key={owner.searchTerm}
            codeManager={codeManager}
            githubManager={githubManager}
            owner={owner}
          />
        ))}
      </List.Section>
    </List>
  );
}
