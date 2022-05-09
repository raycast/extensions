import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useState } from "react";
import { searchMavenArtifact } from "./hooks/hooks";
import { getListIcon } from "./utils/ui-utils";
import { actionIcons, buildDependency, buildUpdatedDate, dependencyTypes, isEmpty } from "./utils/common-utils";
import { MAVEN_CENTRAL_REPOSITORY_SEARCH } from "./utils/constants";
import { ActionToAdvancedSearchOptions } from "./components/action-to-advanced-search-options";
import { ActionToPexels } from "./components/action-to-pexels";
import { MavenEmptyView } from "./components/maven-empty-view";

export default function SearchMavenCentralRepository() {
  const [searchContent, setSearchContent] = useState<string>("");
  const { docs, loading } = searchMavenArtifact(searchContent.trim());

  const emptyViewTitle = () => {
    if (loading) {
      return "Loading...";
    }
    if (docs.length === 0 && !isEmpty(searchContent)) {
      return "No Artifacts";
    }
    return "Official search of Maven Central Repository";
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search maven central repository"}
      searchText={searchContent}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      <MavenEmptyView title={emptyViewTitle()} />
      {docs.map((value, index) => (
        <List.Item
          key={index}
          icon={{ source: getListIcon(value.a) }}
          title={value.id}
          subtitle={{
            value: value.latestVersion,
            tooltip: `Latest Version: ${value.latestVersion}, Versions count: ${value.versionCount}`,
          }}
          accessories={[
            {
              text: buildUpdatedDate(value.timestamp),
              tooltip: "Updated: " + new Date(value.timestamp).toLocaleString(),
            },
          ]}
          actions={
            <ActionPanel>
              {!searchContent.startsWith("a:") && (
                <Action
                  icon={Icon.MagnifyingGlass}
                  title={"Search Artifact ID"}
                  onAction={() => {
                    setSearchContent(`a:${value.a}`);
                  }}
                />
              )}
              {!searchContent.startsWith("g:") && (
                <Action
                  icon={Icon.MagnifyingGlass}
                  title={"Search Group ID"}
                  onAction={() => {
                    setSearchContent(`g:${value.g}`);
                  }}
                />
              )}
              <ActionPanel.Section>
                <ActionToAdvancedSearchOptions />
              </ActionPanel.Section>
              <ActionPanel.Section title={"Copy Dependency"}>
                {dependencyTypes.map((dependenceType, index) => {
                  return (
                    <Action.CopyToClipboard
                      key={dependenceType}
                      icon={{ source: actionIcons[index] }}
                      title={`${dependenceType}`}
                      content={buildDependency(value, dependenceType)}
                    />
                  );
                })}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <ActionToPexels url={MAVEN_CENTRAL_REPOSITORY_SEARCH + "/search?q=" + searchContent} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
