import { Action, ActionPanel, Clipboard, Icon, List, open, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { artifactModel } from "./model/packages-model";
import { ArtifactTag, fetchArtifacts } from "./utils/google-maven-utils";
import { googleMavenRepository } from "./utils/constans";

export default function SearchGoogleArtifact() {
  const [searchContent, setSearchContent] = useState<string>("");
  const [startSearch, setStartSearch] = useState<number[]>([0]);
  const [loading, setLoading] = useState<boolean>(true);
  const [artifactName, setArtifactName] = useState<string[]>([]);
  const [artifactInfo, setArtifactInfo] = useState<artifactModel[][]>([]);
  const [tagList, setTagList] = useState<ArtifactTag[]>([]);
  const [currentTag, setCurrentTag] = useState<string>("");

  useEffect(() => {
    async function _fetchWallpaper() {
      setLoading(true);
      const { tagList, artifactName, artifactInfo } = await fetchArtifacts(searchContent);
      setTagList(tagList);
      setArtifactName(artifactName);
      setArtifactInfo(artifactInfo);
      setLoading(false);
    }

    _fetchWallpaper().then();
  }, [startSearch]);

  return (
    <List
      isShowingDetail={false}
      isLoading={loading}
      searchBarPlaceholder={'Search artifact, like "activity"'}
      searchBarAccessory={
        <List.Dropdown onChange={(value) => setCurrentTag(value)} tooltip={"Group"}>
          {tagList.map((tag) => {
            return <List.Dropdown.Item key={tag.value} value={tag.value} title={tag.title} />;
          })}
        </List.Dropdown>
      }
      onSearchTextChange={setSearchContent}
    >
      {artifactName.length === 0 ? (
        <List.EmptyView
          title={`Welcome to Google's Maven Repository`}
          icon={"android-bot.svg"}
          actions={
            <ActionPanel>
              <Action
                title={`Search ${searchContent}`}
                icon={Icon.Globe}
                onAction={async () => {
                  const _startSearch = [...startSearch];
                  _startSearch[0]++;
                  setStartSearch(_startSearch);
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
        artifactInfo.map((artifacts, artifactsIndex) => {
          return (
            <List.Section key={artifactsIndex + artifactName[artifactsIndex]} title={artifactName[artifactsIndex]}>
              {(currentTag === artifacts[0].artifact || currentTag == tagList[0].value) &&
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
                              const _startSearch = [...startSearch];
                              _startSearch[0]++;
                              setStartSearch(_startSearch);
                            }}
                          />
                          <Action
                            title={"Copy Version"}
                            icon={Icon.Clipboard}
                            onAction={async () => {
                              await Clipboard.copy(artifact.content);
                              await showToast(Toast.Style.Success, "Success!", "Version is copied.");
                            }}
                          />
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
