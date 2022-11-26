import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { ActionPanel, Detail, List, Action } from "@raycast/api";
import { ResData, BaseListData, Item, AsyncStatus } from "./type";
import { useAsync } from "./hooks";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { status, value, reset, execute } = useAsync<BaseListData<Item>>(fetchResource);

  useEffect(() => {
    console.log(`searchText: ${searchText}`);
    if (!searchText) {
      reset();
      return;
    }

    execute(searchText);
  }, [searchText]);

  // searchText={searchText} 导致无法输入中文
  return (
    <List isLoading={status === AsyncStatus.pending} onSearchTextChange={(text) => setSearchText(text)}>
      {value?.list.map((item, index) => (
        <List.Item
          key={index}
          icon="list-icon.png"
          title={item.label}
          accessoryTitle={item.content}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Bookmark" url={item.content} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const apiBaseUrl = "http://127.0.0.1:7788";

async function fetchResource(search: string): Promise<BaseListData<Item>> {
  const response = await fetch(`${apiBaseUrl}/resource/search?search=${search}`, {
    method: "GET",
  });

  if (!response.ok) {
    console.error("fetch base schema error:", await response.text());
    throw new Error(response.statusText);
  }

  const { code, msg, data } = (await response.json()) as ResData<BaseListData<Item>>;

  if (code !== 0) {
    throw new Error(msg || "error");
  }

  console.log("data length:", data?.list?.length);

  return data;
}
