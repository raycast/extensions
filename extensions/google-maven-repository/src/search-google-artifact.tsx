import { Action, ActionPanel, Icon, List, open, showHUD } from "@raycast/api";
import { useState } from "react";
import { googleMavenRepository } from "./utils/constans";
import { searchArtifacts } from "./hooks/hooks";

export default function SearchGoogleArtifact() {
  const [searchContent, setSearchContent] = useState<string>("");
  const [startSearch, setStartSearch] = useState<string>("");
  const [currentTag, setCurrentTag] = useState<string>("");
  const { artifactInfo, loading } = searchArtifacts(startSearch);

  return (
    <List
      isShowingDetail={false}
      isLoading={loading}
      searchBarPlaceholder={'Search artifacts, like "activity"'}
      searchBarAccessory={
        <List.Dropdown onChange={(value) => setCurrentTag(value)} tooltip={"Group"}>
          {artifactInfo.tagList.map((tag) => {
            return <List.Dropdown.Item key={tag.value} value={tag.value} title={tag.title} />;
          })}
        </List.Dropdown>
      }
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      {artifactInfo.artifactName.length === 0 ? (
        <List.EmptyView
          title={`Welcome to Google's Maven Repository`}
          icon={"android-bot.svg"}
          actions={
            <ActionPanel>
              <Action
                title={`Search ${searchContent}`}
                icon={Icon.Globe}
                onAction={async () => {
                  setStartSearch(searchContent);
                }}
              />
              <Action
                title={"Show Maven in Browser"}
                icon={Icon.Globe}
                onAction={async () => {
                  await open(googleMavenRepository);
                  await showHUD("Show Maven in Browser");
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        artifactInfo.artifactInfo.map((artifacts, artifactsIndex) => {
          return (
            <List.Section
              key={artifactsIndex + artifactInfo.artifactName[artifactsIndex]}
              title={artifactInfo.artifactName[artifactsIndex]}
            >
              {(currentTag === artifacts[0].artifact || currentTag == artifactInfo.tagList[0].value) &&
                artifacts.map((artifact, artifactIndex) => {
                  return (
                    <List.Item
                      key={artifactIndex + artifact.content}
                      title={artifact.content}
                      icon={"icon_maven.png"}
                      actions={
                        <ActionPanel>
                          <Action
                            title={`Search ${searchContent}`}
                            icon={Icon.Globe}
                            onAction={async () => {
                              setStartSearch(searchContent);
                            }}
                          />
                          <Action.CopyToClipboard title={"Copy Artifact Version"} content={artifact.content} />
                          <Action
                            title={"Show Maven in Browser"}
                            icon={Icon.Globe}
                            shortcut={{ modifiers: ["cmd"], key: "g" }}
                            onAction={async () => {
                              await open(googleMavenRepository);
                              await showHUD("Show Maven in Browser");
                            }}
                          />
                        </ActionPanel>
                      }
                    />
                  );
                })}
            </List.Section>
          );
        })
      )}
    </List>
  );
}
