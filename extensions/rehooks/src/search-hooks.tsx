import { CopyToClipboardAction, ReloadAction } from "./components/actions";
import { ActionPanel, List } from "@raycast/api";
import { useSearch } from "./hooks/useSearch";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data, revalidate } = useSearch(searchText);

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
              <CopyToClipboardAction title={item.title} content={item.content} />
              <ReloadAction onReload={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
