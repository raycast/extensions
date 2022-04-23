import { Action, ActionPanel, Icon, List, open, showHUD } from "@raycast/api";
import { useState } from "react";
import { ArtifactList } from "./utils/ui-component";
import { googleMavenRepository } from "./utils/constans";
import { searchArtifacts } from "./hooks/hooks";

export default function ShowGoogleArtifact(props: { packageName: string }) {
  const packageName = props.packageName;
  const [currentTag, setCurrentTag] = useState<string>("");
  const { artifactInfo, loading } = searchArtifacts(packageName);

  return (
    <List
      isShowingDetail={false}
      isLoading={loading}
      searchBarPlaceholder={"Search artifacts or version"}
      navigationTitle={`${packageName}`}
      searchBarAccessory={
        <List.Dropdown onChange={(value) => setCurrentTag(value)} tooltip={"Group"}>
          {artifactInfo.tagList.map((tag) => {
            return <List.Dropdown.Item key={tag.value} value={tag.value} title={tag.title} />;
          })}
        </List.Dropdown>
      }
    >
      {artifactInfo.artifactName.length === 0 &&
      artifactInfo.artifactInfo.length === 0 &&
      artifactInfo.tagList.length === 0 ? (
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
        artifactInfo.artifactInfo.map((artifacts, artifactsIndex) => {
          return (
            <ArtifactList
              key={artifactsIndex}
              artifactName={artifactInfo.artifactName}
              artifacts={artifacts}
              artifactsIndex={artifactsIndex}
              currentTag={currentTag}
              tagList={artifactInfo.tagList}
            />
          );
        })
      )}
    </List>
  );
}
