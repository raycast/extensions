import { Action, ActionPanel, Icon, List, open, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { artifactModel } from "./model/packages-model";
import { ArtifactTag, fetchArtifacts } from "./utils/google-maven-utils";
import { ArtifactList } from "./utils/ui-component";
import { googleMavenRepository } from "./utils/constans";

export default function ShowGoogleArtifact(props: { packageName: string }) {
  const packageName = props.packageName;
  const [loading, setLoading] = useState<boolean>(true);
  const [artifactName, setArtifactName] = useState<string[]>([]);
  const [artifactInfo, setArtifactInfo] = useState<artifactModel[][]>([]);
  const [tagList, setTagList] = useState<ArtifactTag[]>([]);
  const [currentTag, setCurrentTag] = useState<string>("");

  useEffect(() => {
    async function _fetchWallpaper() {
      setLoading(true);
      const { tagList, artifactName, artifactInfo } = await fetchArtifacts(packageName);
      setTagList(tagList);
      setArtifactName(artifactName);
      setArtifactInfo(artifactInfo);
      setLoading(false);
    }

    _fetchWallpaper().then();
  }, []);

  return (
    <List
      isShowingDetail={false}
      isLoading={loading}
      searchBarPlaceholder={"Search artifact or version"}
      navigationTitle={`${packageName}`}
      searchBarAccessory={
        <List.Dropdown onChange={(value) => setCurrentTag(value)} tooltip={"Group"}>
          {tagList.map((tag) => {
            return <List.Dropdown.Item key={tag.value} value={tag.value} title={tag.title} />;
          })}
        </List.Dropdown>
      }
    >
      {artifactName.length === 0 && artifactInfo.length === 0 && tagList.length === 0 ? (
        <List.EmptyView
          title={`Welcome to Google's Maven Repository`}
          icon={"android-bot.svg"}
          actions={
            <ActionPanel>
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
            <ArtifactList
              key={artifactsIndex}
              artifactName={artifactName}
              artifacts={artifacts}
              artifactsIndex={artifactsIndex}
              currentTag={currentTag}
              tagList={tagList}
            />
          );
        })
      )}
    </List>
  );
}
