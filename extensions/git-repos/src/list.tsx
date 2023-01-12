import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";

import { useState, ReactElement } from "react";
import { gitRemotes, Preferences, tildifyPath, useRepoCache } from "./utils";

export default function Main(): ReactElement {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState<string>();
  const { response, error, isLoading } = useRepoCache(searchText);

  if (error) {
    showToast(Toast.Style.Failure, "", error);
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
                  <Action.Open
                    title={`Open in ${preferences.openWith1.name}`}
                    icon={{ fileIcon: preferences.openWith1.path }}
                    target={repo.fullPath}
                    application={preferences.openWith1.bundleId}
                  />
                  <Action.Open
                    title={`Open in ${preferences.openWith2.name}`}
                    icon={{ fileIcon: preferences.openWith2.path }}
                    target={repo.fullPath}
                    application={preferences.openWith2.bundleId}
                  />
                  {preferences.openWith3 && (
                    <Action.Open
                      title={`Open in ${preferences.openWith3.name}`}
                      icon={{ fileIcon: preferences.openWith3.path }}
                      target={repo.fullPath}
                      application={preferences.openWith3.bundleId}
                      shortcut={{ modifiers: ["opt"], key: "return" }}
                    />
                  )}
                  {preferences.openWith4 && (
                    <Action.Open
                      title={`Open in ${preferences.openWith4.name}`}
                      icon={{ fileIcon: preferences.openWith4.path }}
                      target={repo.fullPath}
                      application={preferences.openWith4.bundleId}
                      shortcut={{ modifiers: ["ctrl"], key: "return" }}
                    />
                  )}
                  {preferences.openWith5 && (
                    <Action.Open
                      title={`Open in ${preferences.openWith5.name}`}
                      icon={{ fileIcon: preferences.openWith5.path }}
                      target={repo.fullPath}
                      application={preferences.openWith5.bundleId}
                      shortcut={{ modifiers: ["shift"], key: "return" }}
                    />
                  )}
                  <Action.OpenWith path={repo.fullPath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {gitRemotes(repo.fullPath).map((remote) => {
                    let shortcut = undefined as Keyboard.Shortcut | undefined;
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
                          <Action.OpenInBrowser
                            title={`Code`}
                            key={`code ${remote.name}`}
                            url={remote.url}
                            icon={{ source: "github-code-icon.png", tintColor: Color.PrimaryText }}
                            shortcut={{ modifiers: ["shift", "cmd"], key: "c" }}
                          />
                          <Action.OpenInBrowser
                            title={`Issues`}
                            key={`issues ${remote.name}`}
                            url={`${remote.url}/issues`}
                            icon={{ source: "github-issues-icon.png", tintColor: Color.PrimaryText }}
                            shortcut={{ modifiers: ["shift", "cmd"], key: "i" }}
                          />
                          <Action.OpenInBrowser
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
                        <Action.OpenInBrowser
                          title={`Open ${remote.name} on ${host}`}
                          key={`open remote ${remote.name}`}
                          url={remote.url}
                          shortcut={shortcut}
                          icon={icon ?? Icon.Globe}
                        />
                      );
                    }
                  })}
                  <Action.CopyToClipboard
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
