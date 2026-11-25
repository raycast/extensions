import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { ErrorView, ItemRow } from "./components";
import { searchLibrary } from "./sponge";

export default function Command() {
  const [query, setQuery] = useState("");
  const abortable = useRef<AbortController>(null);
  const trimmed = query.trim();
  const { data, isLoading, error, revalidate } = usePromise(
    async (text: string) => (text ? searchLibrary(text, abortable.current?.signal) : []),
    [trimmed],
    { abortable },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} searchBarPlaceholder="Search saved text" throttle>
      {error ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : !trimmed ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Search Your Sponge Library" />
      ) : !isLoading && data?.length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No Matching Saved Text" />
      ) : (
        data?.map((item) => <ItemRow key={item.itemId} item={item} />)
      )}
    </List>
  );
}
