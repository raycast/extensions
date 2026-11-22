import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { searchItems } from "./api";
import { ErrorView } from "./components/ErrorView";
import { WorkItemListItem } from "./components/WorkItemListItem";

export default function Command() {
  const [text, setText] = useState("");
  const { data, isLoading, error, revalidate } = usePromise(searchItems, [text], { execute: text.trim().length > 0 });

  return (
    <List
      isLoading={isLoading}
      throttle
      filtering={false}
      onSearchTextChange={setText}
      searchBarPlaceholder="Work item number or text…"
    >
      {error ? (
        <ErrorView error={error} retry={revalidate} />
      ) : !text.trim() ? (
        <List.EmptyView
          title="Search work items"
          description="Type a number (51273) or words from the title."
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        <List.Section title="Results" subtitle={String(data?.length ?? 0)}>
          {(data ?? []).map((it) => (
            <WorkItemListItem key={it.id} item={it} onDone={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
