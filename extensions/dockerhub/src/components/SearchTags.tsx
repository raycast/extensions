import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { searchTag } from "../lib/api";
import { Tag, TagImage } from "../lib/type";

export default function SearchTags({ image }: { image: string }) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const onSearchTextChange = useCallback(async (text: string) => {
    const abortCtrl = new AbortController();

    const fn = async () => {
      setLoading(true);
      try {
        const result = await searchTag(image, { page_size: 50, name: text }, abortCtrl.signal);
        setTags(result);
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: (err as Error).message,
        });
      } finally {
        setLoading(false);
      }
    };

    fn();
    return () => abortCtrl.abort();
  }, []);

  useEffect(() => {
    onSearchTextChange("");
  }, []);

  return (
    <List isLoading={loading} onSearchTextChange={onSearchTextChange} throttle>
      {tags.map((tag) =>
        tag.images?.map((image: TagImage) => (
          <List.Item
            key={`${tag.id}-${image.digest}`}
            title={`${tag.name}`}
            subtitle={`${tag.update_time ? tag.update_time : ""} by ${tag.last_updater_username}`}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Pull Command" content={`docker pull ${image}:${tag.name}`} />
                <Action.CopyToClipboard title="Copy Name with Tag" content={`${image}:${tag.name}`} />
                <Action.OpenInBrowser url={image.url ? image.url : ""} />
                <Action.CopyToClipboard title="Copy URL" content={image.url ? image.url : ""} />
              </ActionPanel>
            }
            accessories={[
              {
                text: `${image.os_arch ? image.os_arch : ""} ${image.sizeHuman ? image.sizeHuman : ""}`,
              },
            ]}
          />
        ))
      )}
    </List>
  );
}
