import { List } from "@raycast/api";
import React, { useState } from "react";
import { searchRepos } from "./hooks/hooks";
import { GiteeEmptyView } from "./components/GiteeEmptyView";
import { ReposItem } from "./components/ReposItem";

export default function SearchRepositories() {
  const [searchContent, setSearchContent] = useState<string>("");
  const { repos, loading } = searchRepos(searchContent);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search repositories"}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      {repos.length === 0 ? (
        <GiteeEmptyView />
      ) : (
        repos.map((repo) => {
          return <ReposItem key={repo.id} repo={repo} />;
        })
      )}
    </List>
  );
}
