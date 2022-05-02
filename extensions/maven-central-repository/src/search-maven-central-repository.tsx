import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useState } from "react";
import { searchMavenArtifact } from "./hooks/hooks";
import { getListIcon } from "./utils/ui-utils";
import { buildDependency, buildUpdatedDate, dependencyTypes } from "./utils/common-utils";
import { ActionToAdvancedSearchOptions, ActionToPexels } from "./utils/ui-components";
import { MAVEN_CENTRAL_REPOSITORY_SEARCH } from "./utils/constants";

export default function SearchMavenCentralRepository() {
  const [searchContent, setSearchContent] = useState<string>("");
  const { docs, loading } = searchMavenArtifact(searchContent.trim());

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search maven central repository"}
      searchText={searchContent}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      {docs.length === 0 ? (
        <List.EmptyView
          title={"Official search of Maven Central Repository"}
          icon={"empty-view-icon.svg"}
          actions={
            <ActionPanel>
              <ActionToAdvancedSearchOptions />
              <ActionToPexels url={MAVEN_CENTRAL_REPOSITORY_SEARCH} />
            </ActionPanel>
          }
        />
      ) : (
        docs.map((value, index) => (
          <List.Item
            key={index}
            icon={{ source: getListIcon(value.a) }}
            title={value.id}
            subtitle={value.latestVersion}
            accessories={[{ text: buildUpdatedDate(value.timestamp) }]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.MagnifyingGlass}
                  title={"Search Artifact ID"}
                  onAction={() => {
                    setSearchContent(`a:${value.a}`);
                  }}
                />
                <Action
                  icon={Icon.MagnifyingGlass}
                  title={"Search Group ID"}
                  onAction={() => {
                    setSearchContent(`g:${value.g}`);
                  }}
                />
                <ActionToAdvancedSearchOptions />
                <ActionPanel.Section title={"Dependency"}>
                  {dependencyTypes.map((dependenceType) => {
                    return (
                      <Action.CopyToClipboard
                        key={dependenceType}
                        title={`Copy ${dependenceType}`}
                        content={buildDependency(value, dependenceType, "")}
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
        ))
      )}
    </List>
  );
}
