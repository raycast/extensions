import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { searchImage } from "../lib/api";
import { DockerImage } from "../lib/type";
import { mapFromToIcon } from "../lib/util";
import SearchTags from "./SearchTags";

export default function SearchImages() {
  const [images, setImages] = useState<DockerImage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const onSearchTextChange = useCallback((text: string) => {
    const abortCtrl = new AbortController();

    const fn = async () => {
      setLoading(true);
      try {
        const result: DockerImage[] = await searchImage({ q: text, page_size: 50 }, abortCtrl.signal);
        setImages(result);
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

  return (
    <List isLoading={loading} onSearchTextChange={onSearchTextChange} throttle>
      {images.map((item) => (
        <List.Item
          key={item.slug}
          icon={mapFromToIcon(item.from)}
          title={item.name}
          subtitle={item.short_description}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.List} title="Show Tags" target={<SearchTags image={item.slug} />} />
              <Action.CopyToClipboard title="Copy Pull Command" content={`docker pull ${item.slug}`} />
              <Action.CopyToClipboard title="Copy Image Name" content={`${item.slug}`} />
              <Action.OpenInBrowser url={item.url ? item.url : ""} />
              <Action.CopyToClipboard title="Copy URL" content={item.url ? item.url : ""} />
            </ActionPanel>
          }
          accessories={[
            {
              text: `${item.star_count}`,
              icon: Icon.Star,
              tooltip: `${item.star_count} Stars`,
            },
            {
              text: item.pull_count,
              icon: Icon.Download,
              tooltip: `${item.pull_count} Downloads`,
            },
          ]}
        />
      ))}
    </List>
  );
}
