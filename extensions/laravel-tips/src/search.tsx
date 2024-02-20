import { ReactElement, useState } from "react";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { search } from "./laravel-tip";

export default function Search(): ReactElement {
  const [searchText, setSearchText] = useState("");
  const [showingDetail, setShowingDetail] = useState(false);
  const { data: results, isLoading } = usePromise(search, [searchText]);

  if (results?.error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Search failed",
      message: results.error.toString(),
    });
  }

  return (
    <List
      filtering={false}
      searchBarPlaceholder="Search your favorite tips"
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      onSearchTextChange={setSearchText}
    >
      <List.Section
        title={
          results?.data?.length
            ? `Found ${results.data.length} tip${results.data.length > 1 ? "s" : ""}`
            : "No tips found"
        }
      >
        {results?.data?.map((tip) => {
          return (
            <List.Item
              key={tip.id}
              title={tip.title}
              subtitle={`#${tip.title}`}
              detail={<List.Item.Detail markdown={`## ${tip.title}\n\n${tip.content}`} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle Details"
                    icon={Icon.AppWindowSidebarLeft}
                    onAction={() => setShowingDetail(!showingDetail)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
