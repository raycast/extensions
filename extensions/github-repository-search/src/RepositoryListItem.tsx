import { ActionPanel, Color, Icon, List, Action } from "@raycast/api";
import { Repository } from "./types";
import { getAccessories, getIcon, getSubtitle, WEB_IDES } from "./utils";
import { Releases } from "./Releases";
import { getFavicon } from "@raycast/utils";

export function RepositoryListItem(props: { repository: Repository; onVisit: (repository: Repository) => void }) {
  return (
    <List.Item
      icon={getIcon(props.repository)}
      title={props.repository.nameWithOwner}
      subtitle={getSubtitle(props.repository)}
      accessories={getAccessories(props.repository)}
      actions={
        <ActionPanel title={props.repository.nameWithOwner}>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={props.repository.url} onOpen={() => props.onVisit(props.repository)} />
            <ActionPanel.Submenu icon={Icon.Globe} title="Open in Web IDE">
              {WEB_IDES.map((ide) => (
                <Action.OpenInBrowser
                  title={ide.title}
                  icon={ide.icon || getFavicon(ide.baseUrl)}
                  key={ide.title}
                  url={ide.baseUrl + props.repository.nameWithOwner}
                  onOpen={() => props.onVisit(props.repository)}
                />
              ))}
            </ActionPanel.Submenu>
            <Action.OpenInBrowser
              icon="vscode-action-icon.png"
              title="Clone in VSCode"
              url={`vscode://vscode.git/clone?url=${props.repository.url}`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              icon={{ source: "pull-request.png", tintColor: Color.PrimaryText }}
              title="Open Pull Requests"
              url={`${props.repository.url}/pulls`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onOpen={() => props.onVisit(props.repository)}
            />
            {props.repository.hasIssuesEnabled && (
              <Action.OpenInBrowser
                icon={{ source: "issue.png", tintColor: Color.PrimaryText }}
                title="Open Issues"
                url={`${props.repository.url}/issues`}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
                onOpen={() => props.onVisit(props.repository)}
              />
            )}
            {props.repository.hasWikiEnabled && (
              <Action.OpenInBrowser
                icon={{ source: "wiki.png", tintColor: Color.PrimaryText }}
                title="Open Wiki"
                url={`${props.repository.url}/wiki`}
                shortcut={{ modifiers: ["cmd"], key: "w" }}
                onOpen={() => props.onVisit(props.repository)}
              />
            )}
            {props.repository.hasProjectsEnabled && (
              <Action.OpenInBrowser
                icon={{ source: "project.png", tintColor: Color.PrimaryText }}
                title="Open Projects"
                url={`${props.repository.url}/projects`}
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "p" }}
                onOpen={() => props.onVisit(props.repository)}
              />
            )}
            {props.repository.releases?.totalCount > 0 && (
              <Action.Push
                icon={Icon.List}
                title="Browse Releases"
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                target={<Releases repository={props.repository} />}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Repository URL"
              content={props.repository.url}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Name with Owner"
              content={props.repository.nameWithOwner}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Clone Command"
              content={`git clone ${props.repository.url}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
