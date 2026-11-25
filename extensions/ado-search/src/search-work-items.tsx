import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ErrorView } from "./components/sprint/ErrorView";
import { SprintListItem } from "./components/sprint/SprintListItem";
import { searchItems } from "./lib/sprint-api";

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
          description="Type a number (51273) or words from the title or description."
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        <List.Section title="Results" subtitle={String(data?.length ?? 0)}>
          {(data ?? []).map((it) => (
            <SprintListItem key={it.id} item={it} onDone={revalidate} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
