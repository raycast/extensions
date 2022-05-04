import { List } from "@raycast/api";
import { useState } from "react";
import { searchArtifacts } from "./hooks/hooks";
import { ArtifactList, MavenEmptyView } from "./utils/ui-component";

export default function SearchGoogleMavenRepository() {
  const [searchContent, setSearchContent] = useState<string>("");
  const [filter, setFilter] = useState<string>("All");
  const { artifactInfo, loading } = searchArtifacts(searchContent.trim());

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={'Search artifacts, like "activity"'}
      onSearchTextChange={setSearchContent}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Group" onChange={setFilter}>
          {artifactInfo.tagList.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      {artifactInfo.artifactName.length === 0 ? (
        <MavenEmptyView />
      ) : (
        artifactInfo.artifactInfo.map((artifacts, artifactsIndex) => {
          return (
            (filter === artifactInfo.tagList[0].value || filter === artifactInfo.artifactName[artifactsIndex]) && (
              <ArtifactList
                key={artifactsIndex}
                artifactName={artifactInfo.artifactName}
                artifacts={artifacts}
                artifactsIndex={artifactsIndex}
                currentTag={"Artifacts"}
                tagList={artifactInfo.tagList}
              />
            )
          );
        })
      )}
    </List>
  );
}
