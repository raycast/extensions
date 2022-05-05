import { List } from "@raycast/api";
import React, { useState } from "react";
import { getUserRepos } from "./hooks/hooks";
import { GiteeEmptyView } from "./components/GiteeEmptyView";
import { ReposItem } from "./components/ReposItem";

export default function MyRepositories() {
  const [page, setPage] = useState<number>(1);
  const { repos, loading } = getUserRepos(page);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search repositories"}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") {
          const _id = repos[repos.length - 1]?.id + "";
          if (id === _id) {
            setPage(page + 1);
          }
        }
      }}
    >
      <GiteeEmptyView title={"No Repositories"} />
      {repos?.map((repo) => {
        return <ReposItem key={repo.id} repo={repo} />;
      })}
    </List>
  );
}
