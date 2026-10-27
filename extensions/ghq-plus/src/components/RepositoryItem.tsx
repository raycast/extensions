import { Action, ActionPanel, Application, Icon, Keyboard, List } from "@raycast/api";
import type { Repository } from "../lib/ghq";

/** List item of a repository: opens it with the given applications, shows it in Finder or copies its path. */
export function RepositoryItem({ repository, openers }: { repository: Repository; openers: Application[] }) {
  return (
    <List.Item
      icon={Icon.Folder}
      title={repository.relativePath}
      keywords={[repository.name, repository.owner, repository.host].filter((k): k is string => Boolean(k))}
      accessories={repository.host ? [{ text: repository.host }] : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {openers.map((app) => (
              <Action.Open
                key={app.path}
                title={`Open in ${app.name}`}
                icon={{ fileIcon: app.path }}
                target={repository.path}
                application={app}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder path={repository.path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
            <Action.CopyToClipboard
              title="Copy Path"
              content={repository.path}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
