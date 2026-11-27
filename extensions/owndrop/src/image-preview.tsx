import { useRef } from "react";
import { pathToFileURL } from "node:url";
import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type DropItem, getImagePreview } from "./api";

export default function ImagePreview({
  item,
  metadata,
}: {
  item: DropItem;
  metadata?: Parameters<typeof List.Item.Detail>[0]["metadata"];
}) {
  const abortable = useRef<AbortController | null>(null);
  const { data, error, isLoading } = usePromise(
    async (id: string) => {
      // Avoid fetching every image when quickly moving through the list.
      const signal = abortable.current?.signal;
      await new Promise((resolve) => setTimeout(resolve, 120));
      signal?.throwIfAborted();
      return getImagePreview({ ...item, id }, signal);
    },
    [item.id],
    { abortable, onError: () => {} },
  );

  return (
    <List.Item.Detail
      metadata={metadata}
      isLoading={isLoading}
      markdown={
        data
          ? `![Image preview](<${pathToFileURL(data).href}>)`
          : error
            ? `Preview unavailable: ${error.message}`
            : "Loading image…"
      }
    />
  );
}
