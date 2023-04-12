import { Action, ActionPanel, List } from "@raycast/api";
import type { CodeManager } from "../CodeManager";
import type { GitHubManager } from "../GitHubManager";
import type { Owner } from "../types";
import { RepositoriesList } from "./RepositoriesList";

export function OwnersListItem({
  codeManager,
  githubManager,
  owner,
}: {
  codeManager: CodeManager;
  githubManager: GitHubManager;
  owner: Owner;
}) {
  return (
    <List.Item
      title={owner.name}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Search repositories"
              target={<RepositoriesList codeManager={codeManager} githubManager={githubManager} owner={owner} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
