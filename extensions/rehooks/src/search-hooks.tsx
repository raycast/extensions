import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { Hook } from "./types";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data, revalidate } = useFetch<Hook[]>(`https://rehooks.pyr33x.ir/api/hooks?search=${searchText}`, {
    keepPreviousData: true,
  });

  return (
    <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText} throttle>
      {(data || []).map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          detail={item.description}
          subtitle={item.description}
          keywords={[item.title]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title={`Import ${item.title}`} content={item.content} />
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
