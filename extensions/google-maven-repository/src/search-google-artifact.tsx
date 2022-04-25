import { List } from "@raycast/api";
import { useState } from "react";
import { searchArtifacts } from "./hooks/hooks";
import { ArtifactList, MavenEmptyView } from "./utils/ui-component";

export default function SearchGoogleArtifact() {
  const [searchContent, setSearchContent] = useState<string>("");
  const { artifactInfo, loading } = searchArtifacts(searchContent.trim());

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={'Search artifacts, like "activity"'}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      {artifactInfo.artifactName.length === 0 ? (
        <MavenEmptyView />
      ) : (
        artifactInfo.artifactInfo.map((artifacts, artifactsIndex) => {
          return (
            <ArtifactList
              key={artifactsIndex}
              artifactName={artifactInfo.artifactName}
              artifacts={artifacts}
              artifactsIndex={artifactsIndex}
              currentTag={"Artifacts"}
              tagList={artifactInfo.tagList}
            />
          );
        })
      )}
    </List>
  );
}
