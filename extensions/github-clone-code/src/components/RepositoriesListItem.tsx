import { Action, ActionPanel, List } from "@raycast/api";
import type { CodeManager } from "../CodeManager";
import type { Repository } from "../types";

export function RepositoriesListItem({
  codeManager,
  repository,
}: {
  codeManager: CodeManager;
  repository: Repository;
}) {
  return (
    <List.Item
      title={repository.name}
      subtitle={repository.description}
      accessories={[{ text: repository.owner }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open in VS Code" onAction={() => codeManager.cloneAndCode(repository)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
