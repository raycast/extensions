import { ActionPanel, List, Action } from "@raycast/api";
import { IRepositoryListItem } from "@yuntoo/aliyun-codeup-open-api";
import { useEffect, useState } from "react";
import { useRepositoryList } from "./use-repository-list";

export default function Command() {
  const { loading, repositoryList, setViewed } = useRepositoryList();
  const [list, setList] = useState<IRepositoryListItem[]>(repositoryList);

  useEffect(() => {
    setList((prev) => (prev.length ? prev : repositoryList));
  }, [repositoryList]);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search..."
      onSearchTextChange={(text) => {
        if (!text) {
          setList(repositoryList);
          return;
        }
        setList(repositoryList.filter((item) => item.pathWithNamespace.includes(text)));
      }}
    >
      {list.map((item) => {
        const title = item.nameWithNamespace.split("/").slice(1).join("/").trim();
        return (
          <List.Item
            key={item.id}
            title={title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Browser"
                  url={item.webUrl}
                  onOpen={() => {
                    setViewed(item.id);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
