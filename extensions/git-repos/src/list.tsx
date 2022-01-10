import {
  ActionPanel,
  Color,
  CopyToClipboardAction,
  Icon,
  Image,
  KeyboardShortcut,
  List,
  OpenAction,
  OpenInBrowserAction,
  OpenWithAction,
  showToast,
  ToastStyle,
} from "@raycast/api";

import { useState, ReactElement } from "react";
import { gitRemotes, tildifyPath, useRepoCache } from "./utils";

export default function Main(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { response, error, isLoading } = useRepoCache(searchText);

  if (error) {
    showToast(ToastStyle.Failure, "", error);
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading}>
      <List.Section title={response?.sectionTitle}>
        {response?.repos?.map((repo) => (
          <List.Item
            key={repo.fullPath}
            id={repo.fullPath}
            title={repo.name}
            icon={repo.icon}
            accessoryTitle={tildifyPath(repo.fullPath)}
            keywords={[repo.name]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <OpenAction
                    title="Open in VSCode"
                    icon={{ fileIcon: "/Applications/Visual Studio Code.app" }}
                    target={repo.fullPath}
                    application="Visual Studio Code"
                  />
                  <OpenAction
                    title="Open in Terminal"
                    icon={{ fileIcon: "/Applications/iTerm.app" }}
                    target={repo.fullPath}
                    application="iTerm"
                  />
                  <OpenWithAction path={repo.fullPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                  <OpenAction
                    title="Open in Finder"
                    icon={{ fileIcon: "/System/Library/CoreServices/Finder.app" }}
                    target={repo.fullPath}
                    application="Finder"
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {gitRemotes(repo.fullPath).map((remote) => {
                    let shortcut = undefined as KeyboardShortcut | undefined;
                    switch (remote.name) {
                      case "origin":
                        shortcut = { modifiers: ["shift", "cmd"], key: "o" };
                        break;
                      case "upstream":
                        shortcut = { modifiers: ["shift", "cmd"], key: "u" };
                        break;

                      default:
                        break;
                    }

                    let icon = undefined as Image | undefined;
                    let host = remote.host;
                    switch (remote.host) {
                      case "github.com":
                        icon = { source: "github-icon.png", tintColor: Color.PrimaryText };
                        host = "GitHub";
                        break;
                      case "gitlab.com":
                        icon = { source: "gitlab-icon.png", tintColor: Color.PrimaryText };
                        host = "GitLab";
                        break;
                      case "bitbucket.org":
                        icon = { source: "bitbucket-icon.png", tintColor: Color.PrimaryText };
                        host = "Bitbucket";
                        break;

                      default:
                        break;
                    }
                    if (remote.host === "github.com") {
                      return (
                        <ActionPanel.Submenu
                          title={`Open ${remote.name} on ${host}`}
                          key={`GitHub_${remote.name}`}
                          icon={icon ?? Icon.Globe}
                          shortcut={shortcut}
                        >
                          <OpenInBrowserAction
                            title={`Code`}
                            key={`code ${remote.name}`}
                            url={remote.url}
                            icon={{ source: "github-code-icon.png", tintColor: Color.PrimaryText }}
                            shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
                          />
                          <OpenInBrowserAction
                            title={`Issues`}
                            key={`issues ${remote.name}`}
                            url={`${remote.url}/issues`}
                            icon={{ source: "github-issues-icon.png", tintColor: Color.PrimaryText }}
                            shortcut={{ modifiers: ["shift", "cmd"], key: "i" }}
                          />
                          <OpenInBrowserAction
                            title={`Pull Requests`}
                            key={`pulls ${remote.name}`}
                            url={`${remote.url}/pulls`}
                            icon={{ source: "github-pulls-icon.png", tintColor: Color.PrimaryText }}
                            shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
                          />
                        </ActionPanel.Submenu>
                      );
                    } else {
                      return (
                        <OpenInBrowserAction
                          title={`Open ${remote.name} on ${host}`}
                          key={`open remote ${remote.name}`}
                          url={remote.url}
                          shortcut={shortcut}
                          icon={icon ?? Icon.Globe}
                        />
                      );
                    }
                  })}
                  <CopyToClipboardAction
                    title={"Copy Path to Clipboard"}
                    content={repo.fullPath}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
