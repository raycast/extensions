import { List } from "@raycast/api";
import React, { useState } from "react";
import { searchRepos } from "./hooks/hooks";
import { GiteeEmptyView } from "./components/GiteeEmptyView";
import { ReposItem } from "./components/ReposItem";
import { isEmpty } from "./utils/common-utils";

export default function SearchRepositories() {
  const [searchContent, setSearchContent] = useState<string>("");
  const { repos, loading } = searchRepos(searchContent);

  const emptyViewTitle = () => {
    if (loading) {
      return "Loading...";
    }
    if (repos.length === 0 && !isEmpty(searchContent)) {
      return "No Repositories";
    }
    return "Welcome to Gitee";
  };
  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search repositories"}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      <GiteeEmptyView title={emptyViewTitle()} />
      {repos.map((repo) => {
        return <ReposItem key={repo.id} repo={repo} />;
      })}
    </List>
  );
}
