import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { ErrorView, ItemRow } from "./components";
import { listRecent } from "./sponge";

export default function Command() {
  const abortable = useRef<AbortController>(null);
  const { data, isLoading, error, revalidate } = usePromise(() => listRecent(abortable.current?.signal), [], {
    abortable,
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter recent items">
      {error ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : !isLoading && data?.length === 0 ? (
        <List.EmptyView icon={Icon.Tray} title="Your Library Is Empty" description="Save a URL to get started." />
      ) : (
        data?.map((item) => <ItemRow key={item.itemId} item={item} />)
      )}
    </List>
  );
}
