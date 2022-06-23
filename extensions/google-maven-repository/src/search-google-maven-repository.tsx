import { List } from "@raycast/api";
import { useState } from "react";
import { searchArtifacts } from "./hooks/hooks";
import { ArtifactList, MavenEmptyView } from "./utils/ui-component";
import { isEmpty } from "./utils/common-utils";

export default function SearchGoogleMavenRepository() {
  const [searchContent, setSearchContent] = useState<string>("");
  const [filter, setFilter] = useState<string>("All");
  const { artifactInfo, loading } = searchArtifacts(searchContent.trim());

  const emptyViewTitle = () => {
    if (searchContent.length < 4) {
      return "Welcome to Google's Maven Repository";
    }
    if (loading) {
      return "Loading...";
    }
    if (artifactInfo.artifactInfo.length === 0 && !isEmpty(searchContent)) {
      return "No Artifacts";
    }
    return "Welcome to Google's Maven Repository";
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={'Search artifacts, like "androidx:viewpager2"'}
      onSearchTextChange={setSearchContent}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Group" onChange={setFilter}>
          {searchContent.length < 4
            ? null
            : artifactInfo.tagList.map((value) => {
                return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
              })}
        </List.Dropdown>
      }
    >
      <MavenEmptyView
        title={emptyViewTitle()}
        description={
          searchContent.length < 4 && !isEmpty(searchContent)
            ? "You must enter at least 4 characters when searching..."
            : " "
        }
      />
      {artifactInfo.artifactInfo.map((artifacts, artifactsIndex) => {
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
      })}
    </List>
  );
}
